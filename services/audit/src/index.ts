import { createId, createServer, healthResponse, sendJson, type AuditLog, getMongoDb } from '@icu/shared';

const serviceName = 'audit-service';
const port = Number(process.env.PORT ?? 4008);

let logsColl: any = null;

const server = createServer([
  {
    method: 'GET',
    pattern: /^\/health$/,
    handler: ({ res }) => sendJson(res, 200, healthResponse(serviceName))
  },
  {
    method: 'GET',
    pattern: /^\/logs$/,
    handler: async ({ res }) => {
      const items = await logsColl.find({}).sort({ createdAt: -1 }).limit(200).toArray().catch(() => []);
      sendJson(res, 200, { logs: items });
    }
  },
  {
    method: 'POST',
    pattern: /^\/logs$/,
    handler: async ({ res, body }) => {
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
      await logsColl.insertOne(log);
      sendJson(res, 201, { log });
    }
  }
]);

async function initAndListen() {
  try {
    const db = await getMongoDb();
    logsColl = db.collection('logs');
    await logsColl.createIndex({ actorId: 1, createdAt: -1 }).catch(() => {});

    server.listen(port, () => {
      console.log(`${serviceName} listening on :${port}`);
    });
  } catch (err) {
    console.error('Failed to initialize database connection', err);
    process.exit(1);
  }
}

void initAndListen();
