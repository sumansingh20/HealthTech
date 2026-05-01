import {
  createEvent,
  createId,
  createPatientSchema,
  createServer,
  demoAlerts,
  demoDevices,
  demoPatients,
  demoPredictions,
  demoTimeline,
  demoVitals,
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

const serviceName = 'patient-service';
const port = Number(process.env.PORT ?? 4002);

const patients = new Map<string, Patient>(demoPatients.map((patient) => [patient.id, patient]));
const devices = new Map<string, Device>(demoDevices.map((device) => [device.patientId, device]));
const vitals = new Map<string, VitalReading>(demoVitals.map((reading) => [reading.patientId, reading]));
const predictions = new Map<string, Prediction>(demoPredictions.map((prediction) => [prediction.patientId, prediction]));
const alerts = demoAlerts;

function dashboardPatient(patient: Patient): DashboardPatient {
  const latestVitals = vitals.get(patient.id);
  const latestPrediction = predictions.get(patient.id);
  return {
    ...patient,
    ...(devices.get(patient.id) ? { device: devices.get(patient.id)! } : {}),
    ...(latestVitals ? { latestVitals } : {}),
    ...(latestPrediction ? { latestPrediction } : {}),
    activeAlerts: alerts.filter((alert) => alert.patientId === patient.id && !alert.acknowledgedAt),
    timeline: demoTimeline.filter((event) => event.patientId === patient.id),
    trend: latestVitals ? makeTrend(latestVitals) : []
  };
}

function listPatients() {
  return Array.from(patients.values()).sort((left, right) => left.bedId.localeCompare(right.bedId));
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
    handler: ({ res }) => sendJson(res, 200, { patients: listPatients().map(dashboardPatient) })
  },
  {
    method: 'POST',
    pattern: /^\/patients$/,
    handler: ({ res, body }) => {
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
      patients.set(patient.id, patient);
      sendJson(res, 201, {
        patient,
        event: createEvent({ id: createId('event'), name: 'patient.created', source: serviceName, payload: patient })
      });
    }
  },
  {
    method: 'GET',
    pattern: /^\/patients\/[^/]+$/,
    handler: ({ res, pathname }) => {
      const id = matchId(pathname);
      const patient = id ? patients.get(id) : undefined;
      if (!patient) {
        sendJson(res, 404, { error: 'patient_not_found' });
        return;
      }
      sendJson(res, 200, { patient: dashboardPatient(patient) });
    }
  },
  {
    method: 'PATCH',
    pattern: /^\/patients\/[^/]+$/,
    handler: ({ res, pathname, body }) => {
      const id = matchId(pathname);
      const patient = id ? patients.get(id) : undefined;
      if (!patient) {
        sendJson(res, 404, { error: 'patient_not_found' });
        return;
      }

      const next = patientSchema.partial().parse(body);
      const definedPatch = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined));
      const updated = patientSchema.parse({ ...patient, ...definedPatch, id: patient.id });
      patients.set(patient.id, updated);
      sendJson(res, 200, {
        patient: dashboardPatient(updated),
        event: createEvent({ id: createId('event'), name: 'patient.updated', source: serviceName, payload: updated })
      });
    }
  },
  {
    method: 'GET',
    pattern: /^\/dashboard$/,
    handler: ({ res }) => {
      const patientViews = listPatients().map(dashboardPatient);
      const activeAlerts: Alert[] = alerts.filter((alert) => !alert.acknowledgedAt);
      sendJson(res, 200, {
        generatedAt: new Date().toISOString(),
        patients: patientViews,
        capacity: {
          beds: 12,
          occupied: patientViews.length,
          critical: patientViews.filter((patient) => patient.status === 'critical').length,
          warning: patientViews.filter((patient) => patient.status === 'watching').length
        },
        alerts: activeAlerts
      });
    }
  }
]);

server.listen(port, () => {
  console.log(`${serviceName} listening on :${port}`);
});
