import { createId, createServer, demoUsers, healthResponse, sendJson, type AuditLog } from '@icu/shared';

const serviceName = 'audit-service';
const port = Number(process.env.PORT ?? 4008);

const logs: AuditLog[] = [
  {
    id: createId('log'),
    actorId: demoUsers[0]!.id,
    actorRole: 'doctor',
    action: 'dashboard.opened',
    resource: 'dashboard',
    metadata: { origin: 'demo-seed' },
    createdAt: new Date().toISOString()
  }
];

const server = createServer([
  {
    method: 'GET',
    pattern: /^\/health$/,
    handler: ({ res }) => sendJson(res, 200, healthResponse(serviceName))
  },
  {
    method: 'GET',
    pattern: /^\/logs$/,
    handler: ({ res }) => sendJson(res, 200, { logs })
  },
  {
    method: 'POST',
    pattern: /^\/logs$/,
    handler: ({ res, body }) => {
      const incoming = body as Partial<AuditLog>;
      const log: AuditLog = {
        id: createId('log'),
        actorId: incoming.actorId ?? 'system',
        actorRole: incoming.actorRole ?? 'admin',
        action: incoming.action ?? 'unknown',
        resource: incoming.resource ?? 'system',
        createdAt: new Date().toISOString(),
        ...(incoming.resourceId ? { resourceId: incoming.resourceId } : {}),
        ...(incoming.ipAddress ? { ipAddress: incoming.ipAddress } : {}),
        ...(incoming.metadata ? { metadata: incoming.metadata } : {})
      };
      logs.unshift(log);
      sendJson(res, 201, { log });
    }
  }
]);

server.listen(port, () => {
  console.log(`${serviceName} listening on :${port}`);
});
