import {
  createEvent,
  createId,
  createServer,
  healthResponse,
  matchId,
  sendJson,
  type Alert
} from '@icu/shared';
import { getMongoDb } from '@icu/shared/mongo';

const serviceName = 'notification-service';
const port = Number(process.env.PORT ?? 4006);
let alertsColl: any = null;
let outboxColl: any = null;

async function queueNotification(alert: Alert) {
  const recipients = [
    { channel: 'sms' as const, recipient: '+15550100100' },
    { channel: 'email' as const, recipient: 'icu-charge@hospital.local' }
  ];

  for (const target of recipients) {
    await outboxColl.insertOne({
      id: createId('notification'),
      alertId: alert.id,
      channel: target.channel,
      recipient: target.recipient,
      status: 'queued',
      createdAt: new Date().toISOString()
    });
  }
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
    handler: async ({ res }) => {
      const all = await alertsColl.find({}).sort({ createdAt: -1 }).limit(200).toArray().catch(() => []);
      const outbox = await outboxColl.find({}).sort({ createdAt: -1 }).limit(200).toArray().catch(() => []);
      sendJson(res, 200, { alerts: all, notifications: outbox });
    }
  },
  {
    method: 'POST',
    pattern: /^\/alerts$/,
    handler: async ({ res, body }) => {
      const incoming = body as Partial<Alert>;
      const alert: Alert = {
        id: createId('alert'),
        patientId: incoming.patientId ?? 'unknown-patient',
        severity: incoming.severity ?? 'warning',
        message: incoming.message ?? 'Clinical warning threshold crossed',
        createdAt: new Date().toISOString()
      };
      await alertsColl.insertOne(alert);
      await queueNotification(alert);
      sendJson(res, 201, {
        alert,
        event: createEvent({ id: createId('event'), name: 'alert.created', source: serviceName, payload: alert })
      });
    }
  },
  {
    method: 'POST',
    pattern: /^\/alerts\/[^/]+\/ack$/,
    handler: async ({ res, pathname, body }) => {
      const id = pathname.split('/').at(-2);
      const existing = id ? await alertsColl.findOne({ id }) : null;
      if (!existing) {
        sendJson(res, 404, { error: 'alert_not_found' });
        return;
      }

      const actor = (body as { actorId?: string }).actorId ?? 'system';
      const acknowledged = { ...existing, acknowledgedAt: new Date().toISOString(), acknowledgedBy: actor };
      await alertsColl.updateOne({ id: existing.id }, { $set: acknowledged });
      sendJson(res, 200, {
        alert: acknowledged,
        event: createEvent({ id: createId('event'), name: 'alert.acknowledged', source: serviceName, payload: acknowledged })
      });
    }
  },
  {
    method: 'POST',
    pattern: /^\/notifications\/simulate$/,
    handler: async ({ res }) => {
      const result = await outboxColl.updateMany({ status: 'queued' }, { $set: { status: 'sent' } }).catch(() => ({ modifiedCount: 0 }));
      const sent = result.modifiedCount ?? 0;
      sendJson(res, 200, {
        sent,
        event: createEvent({ id: createId('event'), name: 'notification.sent', source: serviceName, payload: { sent } })
      });
    }
  }
]);

async function initAndListen() {
  try {
    const db = await getMongoDb();
    alertsColl = db.collection('alerts');
    outboxColl = db.collection('notifications_outbox');
    await alertsColl.createIndex({ patientId: 1, createdAt: -1 }).catch(() => {});
    await outboxColl.createIndex({ status: 1, createdAt: -1 }).catch(() => {});

    server.listen(port, () => {
      console.log(`${serviceName} listening on :${port}`);
    });
  } catch (err) {
    console.error('Failed to initialize database connection', err);
    process.exit(1);
  }
}

void initAndListen();
