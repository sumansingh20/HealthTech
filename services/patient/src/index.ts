import {
  createEvent,
  createId,
  createPatientSchema,
  createServer,
  healthResponse,
  makeTrend,
  matchId,
  patientSchema,
  sendJson,
  type Alert,
  type DashboardPatient,
  type Device,
  type Patient,
  type Prediction,
  type VitalReading
} from '@icu/shared';
import { getMongoDb } from '@icu/shared';

const serviceName = 'patient-service';
const port = Number(process.env.PORT ?? 4002);

let patientsColl: any = null;
let devicesColl: any = null;
let vitalsColl: any = null;
let predictionsColl: any = null;
let alertsColl: any = null;

async function dashboardPatient(patient: Patient): Promise<DashboardPatient> {
  const latestVitals = await vitalsColl.findOne({ patientId: patient.id }, { sort: { timestamp: -1 } });
  const latestPrediction = await predictionsColl.findOne({ patientId: patient.id }, { sort: { timestamp: -1 } });
  const device = await devicesColl.findOne({ patientId: patient.id });
  const activeAlerts = await alertsColl.find({ patientId: patient.id, acknowledgedAt: { $exists: false } }).toArray();
  return {
    ...patient,
    ...(device ? { device } : {}),
    ...(latestVitals ? { latestVitals } : {}),
    ...(latestPrediction ? { latestPrediction } : {}),
    activeAlerts,
    timeline: [],
    trend: latestVitals ? makeTrend(latestVitals as VitalReading) : []
  };
}

async function listPatients() {
  const docs = await patientsColl.find({}).sort({ bedId: 1 }).toArray();
  return docs as Patient[];
}

const server = createServer([
  {
    method: 'GET',
    pattern: /^\/health$/,
    handler: ({ res }) => sendJson(res, 200, healthResponse(serviceName))
  },
  {
    method: 'GET',
    pattern: /^\/patients$/,
    handler: async ({ res }) => {
      const pts = await listPatients();
      const mapped = await Promise.all(pts.map((p) => dashboardPatient(p)));
      sendJson(res, 200, { patients: mapped });
    }
  },
  {
    method: 'POST',
    pattern: /^\/patients$/,
    handler: async ({ res, body }) => {
      const parsed = createPatientSchema.parse(body);
      const patient = patientSchema.parse({
        id: createId('patient'),
        mrn: parsed.mrn,
        name: parsed.name,
        age: parsed.age,
        gender: parsed.gender,
        bedId: parsed.bedId,
        primaryDoctorId: parsed.primaryDoctorId,
        status: parsed.status ?? 'stable',
        admittedAt: parsed.admittedAt ?? new Date().toISOString(),
        ...(parsed.diagnosis ? { diagnosis: parsed.diagnosis } : {}),
        ...(parsed.allergies ? { allergies: parsed.allergies } : {}),
        ...(parsed.notes ? { notes: parsed.notes } : {})
      });
      await patientsColl.insertOne(patient);
      sendJson(res, 201, {
        patient,
        event: createEvent({ id: createId('event'), name: 'patient.created', source: serviceName, payload: patient })
      });
    }
  },
  {
    method: 'GET',
    pattern: /^\/patients\/[^/]+$/,
    handler: async ({ res, pathname }) => {
      const id = matchId(pathname);
      if (!id) {
        sendJson(res, 400, { error: 'invalid_id' });
        return;
      }
      const patient = await patientsColl.findOne({ id });
      if (!patient) {
        sendJson(res, 404, { error: 'patient_not_found' });
        return;
      }
      const view = await dashboardPatient(patient as Patient);
      sendJson(res, 200, { patient: view });
    }
  },
  {
    method: 'PATCH',
    pattern: /^\/patients\/[^/]+$/,
    handler: async ({ res, pathname, body }) => {
      const id = matchId(pathname);
      if (!id) {
        sendJson(res, 400, { error: 'invalid_id' });
        return;
      }
      const existing = await patientsColl.findOne({ id });
      if (!existing) {
        sendJson(res, 404, { error: 'patient_not_found' });
        return;
      }
      const next = patientSchema.partial().parse(body);
      const definedPatch = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined));
      const updated = patientSchema.parse({ ...existing, ...definedPatch, id: existing.id });
      await patientsColl.updateOne({ id: existing.id }, { $set: updated });
      const view = await dashboardPatient(updated);
      sendJson(res, 200, {
        patient: view,
        event: createEvent({ id: createId('event'), name: 'patient.updated', source: serviceName, payload: updated })
      });
    }
  },
  {
    method: 'GET',
    pattern: /^\/dashboard$/,
    handler: async ({ res }) => {
      const pts = await listPatients();
      const mapped = await Promise.all(pts.map((p) => dashboardPatient(p)));
      const activeAlerts = await alertsColl.find({ acknowledgedAt: { $exists: false } }).toArray();
      sendJson(res, 200, {
        generatedAt: new Date().toISOString(),
        patients: mapped,
        capacity: {
          beds: 12,
          occupied: mapped.length,
          critical: mapped.filter((patient) => patient.status === 'critical').length,
          warning: mapped.filter((patient) => patient.status === 'watching').length
        },
        alerts: activeAlerts
      });
    }
  }
]);

async function initAndListen() {
  try {
    const db = await getMongoDb();
    patientsColl = db.collection('patients');
    devicesColl = db.collection('devices');
    vitalsColl = db.collection('vitals');
    predictionsColl = db.collection('predictions');
    alertsColl = db.collection('alerts');
    // Ensure simple indexes used by application
    await patientsColl.createIndex({ mrn: 1 }, { unique: true }).catch(() => {});
    await devicesColl.createIndex({ serialNumber: 1 }, { unique: true }).catch(() => {});
    await vitalsColl.createIndex({ patientId: 1, timestamp: -1 }).catch(() => {});
    await alertsColl.createIndex({ patientId: 1, createdAt: -1 }).catch(() => {});

    server.listen(port, () => {
      console.log(`${serviceName} listening on :${port}`);
    });
  } catch (err) {
    console.error('Failed to initialize database connection', err);
    process.exit(1);
  }
}

void initAndListen();
