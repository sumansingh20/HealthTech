import { createServer as createHttpServer } from 'node:http';
import { Redis } from 'ioredis';
import { WebSocketServer } from 'ws';
import {
  computeRiskLevel,
  createEvent,
  createId,
  deriveAlertSeverity,
  healthResponse,
  predictionFromReading,
  REDIS_CHANNELS,
  sendJson,
  vitalReadingSchema,
  type Alert,
  type Prediction,
  type VitalReading,
  getMongoDb
} from '@icu/shared';

const serviceName = 'vitals-service';
const port = Number(process.env.PORT ?? 4003);
const notificationUrl = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:4006';

let vitalsColl: any = null;
let predictionsColl: any = null;
let alertsColl: any = null;

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 }) : undefined;
void redis?.connect().catch(() => undefined);

async function publish(channel: string, payload: unknown) {
  const message = JSON.stringify(payload);
  broadcast(payload);
  if (redis?.status === 'ready') {
    await redis.publish(channel, message);
  }
}

function patientProfile(patientId: string) {
  return { drift: 0, volatility: 0.7, spikeChance: 0.01 };
}

function bounded(value: number, min: number, max: number, digits = 0): number {
  const clipped = Math.min(max, Math.max(min, value));
  return digits > 0 ? Number(clipped.toFixed(digits)) : Math.round(clipped);
}

function nextReading(previous: VitalReading): VitalReading {
  const profile = patientProfile(previous.patientId);
  const spike = Math.random() < profile.spikeChance;
  const deterioration = profile.drift + (spike ? 8 : 0);
  const noise = () => (Math.random() - 0.5) * profile.volatility;

  return {
    ...previous,
    timestamp: new Date().toISOString(),
    heartRate: bounded(previous.heartRate + noise() * 5 + deterioration * 0.6, 38, 165),
    spo2: bounded(previous.spo2 + noise() - deterioration * 0.18 - (spike ? 3 : 0), 78, 100, 1),
    systolic: bounded(previous.systolic + noise() * 6 - deterioration * 0.45 - (spike ? 10 : 0), 64, 205),
    diastolic: bounded(previous.diastolic + noise() * 3 - deterioration * 0.2 - (spike ? 4 : 0), 35, 126),
    temperature: bounded(previous.temperature + noise() * 0.08 + deterioration * 0.015 + (spike ? 0.35 : 0), 34, 41.5, 1)
  };
}

async function sendNotification(alert: Alert) {
  await fetch(`${notificationUrl}/alerts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(alert)
  }).catch(() => undefined);
}

async function ingest(reading: VitalReading) {
  const parsed = vitalReadingSchema.parse(reading);
  const risk = computeRiskLevel(parsed);
  const prediction = predictionFromReading(parsed, 'random-forest');
  const severity = deriveAlertSeverity(risk.score);

  // persist reading and prediction
  await vitalsColl.insertOne(parsed);
  await predictionsColl.insertOne({ ...prediction, timestamp: parsed.timestamp });
  // update latest document for patient
  await vitalsColl.updateOne({ patientId: parsed.patientId, latest: true }, { $set: { ...parsed, latest: true }, $unset: {} }, { upsert: true }).catch(() => {});

  await publish(REDIS_CHANNELS.vitals, createEvent({ id: createId('event'), name: 'vitals.reading.ingested', source: serviceName, payload: parsed }));
  await publish(REDIS_CHANNELS.predictions, createEvent({ id: createId('event'), name: 'prediction.generated', source: serviceName, payload: prediction }));

  if (severity !== 'normal') {
    const alert: Alert = {
      id: createId('alert'),
      patientId: parsed.patientId,
      severity,
      message: `${severity === 'critical' ? 'Critical' : 'Warning'} vitals threshold crossed: ${risk.reasons.join(', ')}`,
      createdAt: parsed.timestamp
    };
    await alertsColl.insertOne(alert);
    await publish(REDIS_CHANNELS.alerts, createEvent({ id: createId('event'), name: 'alert.created', source: serviceName, payload: alert }));
    await sendNotification(alert);
  }

  return { reading: parsed, prediction, severity, risk };
}

const httpServer = createHttpServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const pathname = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;

  if (pathname === '/health') {
    sendJson(res, 200, healthResponse(serviceName));
    return;
  }

  if (method === 'GET' && pathname === '/vitals/latest') {
    const readings = await vitalsColl.find({ latest: true }).toArray().catch(() => []);
    const preds = await predictionsColl.find({}).sort({ timestamp: -1 }).limit(50).toArray().catch(() => []);
    const al = await alertsColl.find({}).sort({ createdAt: -1 }).limit(20).toArray().catch(() => []);
    sendJson(res, 200, { readings, predictions: preds, alerts: al });
    return;
  }

  if (method === 'GET' && /^\/vitals\/[^/]+\/history$/.test(pathname)) {
    const patientId = pathname.split('/').at(-2);
    const history = patientId ? await vitalsColl.find({ patientId }).sort({ timestamp: -1 }).limit(180).toArray().catch(() => []) : [];
    sendJson(res, 200, { patientId, history });
    return;
  }

  if (method === 'POST' && pathname === '/vitals/ingest') {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as VitalReading;
        sendJson(res, 201, await ingest(body));
      } catch (error) {
        sendJson(res, 400, { error: 'invalid_vital_payload', message: error instanceof Error ? error.message : 'Invalid vitals' });
      }
    });
    return;
  }

  sendJson(res, 404, { error: 'not_found', pathname });
});

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

function broadcast(payload: unknown) {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

wss.on('connection', async (socket) => {
  const readings = await vitalsColl.find({ latest: true }).toArray().catch(() => []);
  const preds = await predictionsColl.find({}).sort({ timestamp: -1 }).limit(50).toArray().catch(() => []);
  const al = await alertsColl.find({}).sort({ createdAt: -1 }).limit(50).toArray().catch(() => []);
  socket.send(JSON.stringify({ type: 'snapshot', patients: [], devices: [], readings, predictions: preds, alerts: al }));
});

async function initAndListen() {
  try {
    const db = await getMongoDb();
    vitalsColl = db.collection('vitals');
    predictionsColl = db.collection('predictions');
    alertsColl = db.collection('alerts');
    await vitalsColl.createIndex({ patientId: 1, timestamp: -1 }).catch(() => {});
    await vitalsColl.createIndex({ latest: 1 }).catch(() => {});
    await predictionsColl.createIndex({ patientId: 1, timestamp: -1 }).catch(() => {});
    await alertsColl.createIndex({ patientId: 1, createdAt: -1 }).catch(() => {});

    httpServer.listen(port, () => {
      console.log(`${serviceName} HTTP/WebSocket listening on :${port} (ws://localhost:${port}/ws)`);
    });
  } catch (err) {
    console.error('Failed to initialize database connection', err);
    process.exit(1);
  }
}

void initAndListen();
