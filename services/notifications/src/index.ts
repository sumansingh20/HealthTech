import {
  createEvent,
  createId,
  createServer,
  demoAlerts,
  healthResponse,
  matchId,
  sendJson,
  type Alert
} from '@icu/shared';

const serviceName = 'notification-service';
const port = Number(process.env.PORT ?? 4006);
const alerts = new Map<string, Alert>(demoAlerts.map((alert) => [alert.id, alert]));
const notificationOutbox: Array<{
  id: string;
  alertId: string;
  channel: 'email' | 'sms';
  recipient: string;
  status: 'queued' | 'sent';
  createdAt: string;
}> = [];

function queueNotification(alert: Alert) {
  const recipients = [
    { channel: 'sms' as const, recipient: '+15550100100' },
    { channel: 'email' as const, recipient: 'icu-charge@hospital.local' }
  ];

  for (const target of recipients) {
    notificationOutbox.unshift({
      id: createId('notification'),
      alertId: alert.id,
      channel: target.channel,
      recipient: target.recipient,
      status: 'queued',
      createdAt: new Date().toISOString()
    });
  }
}

for (const alert of alerts.values()) {
  queueNotification(alert);
}

const server = createServer([
  {
    method: 'GET',
    pattern: /^\/health$/,
    handler: ({ res }) => sendJson(res, 200, healthResponse(serviceName))
  },
  {
    method: 'GET',
    pattern: /^\/alerts$/,
    handler: ({ res }) => sendJson(res, 200, { alerts: Array.from(alerts.values()), notifications: notificationOutbox })
  },
  {
    method: 'POST',
    pattern: /^\/alerts$/,
    handler: ({ res, body }) => {
      const incoming = body as Partial<Alert>;
      const alert: Alert = {
        id: createId('alert'),
        patientId: incoming.patientId ?? 'unknown-patient',
        severity: incoming.severity ?? 'warning',
        message: incoming.message ?? 'Clinical warning threshold crossed',
        createdAt: new Date().toISOString()
      };
      alerts.set(alert.id, alert);
      queueNotification(alert);
      sendJson(res, 201, {
        alert,
        event: createEvent({ id: createId('event'), name: 'alert.created', source: serviceName, payload: alert })
      });
    }
  },
  {
    method: 'POST',
    pattern: /^\/alerts\/[^/]+\/ack$/,
    handler: ({ res, pathname, body }) => {
      const id = pathname.split('/').at(-2);
      const alert = id ? alerts.get(id) : undefined;
      if (!alert) {
        sendJson(res, 404, { error: 'alert_not_found' });
        return;
      }

      const actor = (body as { actorId?: string }).actorId ?? 'system';
      const acknowledged: Alert = {
        ...alert,
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: actor
      };
      alerts.set(acknowledged.id, acknowledged);
      sendJson(res, 200, {
        alert: acknowledged,
        event: createEvent({ id: createId('event'), name: 'alert.acknowledged', source: serviceName, payload: acknowledged })
      });
    }
  },
  {
    method: 'POST',
    pattern: /^\/notifications\/simulate$/,
    handler: ({ res }) => {
      for (const notification of notificationOutbox) {
        notification.status = 'sent';
      }
      sendJson(res, 200, {
        sent: notificationOutbox.length,
        event: createEvent({
          id: createId('event'),
          name: 'notification.sent',
          source: serviceName,
          payload: { sent: notificationOutbox.length }
        })
      });
    }
  }
]);

server.listen(port, () => {
  console.log(`${serviceName} listening on :${port}`);
});
