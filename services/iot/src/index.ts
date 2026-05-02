import {
  createId,
  createServer,
  healthResponse,
  sendJson,
  type VitalReading
} from '@icu/shared';

type Scenario = 'normal' | 'gradual-deterioration' | 'sudden-spike';

const serviceName = 'iot-simulator';
const port = Number(process.env.PORT ?? 4005);
const vitalsUrl = process.env.VITALS_SERVICE_URL ?? 'http://localhost:4003';
const patientServiceUrl = process.env.PATIENT_SERVICE_URL ?? 'http://localhost:4002';
const state = new Map<string, VitalReading>();
let scenario: Scenario = 'gradual-deterioration';
let streaming = process.env.IOT_AUTOSTART !== 'false';
let autoStartInterval: NodeJS.Timeout | null = null;
let patientsRegistered = false;

// Default patients to simulate vitals for
const defaultPatients = [
  { id: 'patient_001', name: 'John Smith', age: 65, gender: 'male' as const, bedId: 'B-01', baseHR: 78, baseSPO2: 97, baseSystolic: 128, baseDiastolic: 82, baseTemp: 37.2 },
  { id: 'patient_002', name: 'Maria Garcia', age: 52, gender: 'female' as const, bedId: 'B-02', baseHR: 82, baseSPO2: 95, baseSystolic: 135, baseDiastolic: 85, baseTemp: 37.5 },
  { id: 'patient_003', name: 'Robert Johnson', age: 71, gender: 'male' as const, bedId: 'B-03', baseHR: 88, baseSPO2: 94, baseSystolic: 142, baseDiastolic: 88, baseTemp: 37.8 },
  { id: 'patient_004', name: 'Sarah Williams', age: 45, gender: 'female' as const, bedId: 'B-04', baseHR: 72, baseSPO2: 98, baseSystolic: 118, baseDiastolic: 76, baseTemp: 36.9 },
  { id: 'patient_005', name: 'James Brown', age: 58, gender: 'male' as const, bedId: 'B-05', baseHR: 95, baseSPO2: 91, baseSystolic: 148, baseDiastolic: 92, baseTemp: 38.2 },
  { id: 'patient_006', name: 'Emily Davis', age: 39, gender: 'female' as const, bedId: 'B-06', baseHR: 68, baseSPO2: 99, baseSystolic: 112, baseDiastolic: 70, baseTemp: 36.6 }
];

async function registerPatients() {
  if (patientsRegistered) return;
  
  console.log(`${serviceName}: Registering patients with patient service...`);
  
  for (const patient of defaultPatients) {
    try {
      const response = await fetch(`${patientServiceUrl}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mrn: `ICU-${patient.id.split('_')[1]}`,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          bedId: patient.bedId,
          primaryDoctorId: 'system',
          status: 'stable'
        })
      });
      
      if (response.ok) {
        console.log(`${serviceName}: Registered patient ${patient.name} (${patient.bedId})`);
      } else if (response.status === 409) {
        // Patient already exists, that's fine
        console.log(`${serviceName}: Patient ${patient.name} already exists`);
      }
    } catch (err) {
      console.error(`${serviceName}: Failed to register patient ${patient.name}:`, err);
    }
  }
  
  patientsRegistered = true;
}

function jitter(value: number, spread: number) {
  return value + (Math.random() - 0.5) * spread;
}

function clamp(value: number, min: number, max: number, digits = 0) {
  const clipped = Math.max(min, Math.min(max, value));
  return digits > 0 ? Number(clipped.toFixed(digits)) : Math.round(clipped);
}

function createInitialReading(patient: typeof defaultPatients[0]): VitalReading {
  return {
    patientId: patient.id,
    deviceId: `device_${patient.id}`,
    timestamp: new Date().toISOString(),
    heartRate: patient.baseHR,
    spo2: patient.baseSPO2,
    systolic: patient.baseSystolic,
    diastolic: patient.baseDiastolic,
    temperature: patient.baseTemp
  };
}

function synthesize(previous: VitalReading, activeScenario: Scenario): VitalReading {
  const criticalBias = 0.15;
  const spike = activeScenario === 'sudden-spike' && Math.random() < 0.28;
  const deterioration = activeScenario === 'gradual-deterioration' ? criticalBias : 0;

  return {
    patientId: previous.patientId,
    deviceId: previous.deviceId,
    timestamp: new Date().toISOString(),
    heartRate: clamp(jitter(previous.heartRate, 6) + deterioration + (spike ? 28 : 0), 42, 170),
    spo2: clamp(jitter(previous.spo2, 1.5) - deterioration * 0.2 - (spike ? 7 : 0), 78, 100, 1),
    systolic: clamp(jitter(previous.systolic, 8) - deterioration * 0.8 - (spike ? 24 : 0), 65, 205),
    diastolic: clamp(jitter(previous.diastolic, 4) - deterioration * 0.4 - (spike ? 12 : 0), 36, 125),
    temperature: clamp(jitter(previous.temperature, 0.18) + deterioration * 0.025 + (spike ? 0.6 : 0), 34.2, 41.4, 1)
  };
}

function initializePatients() {
  for (const patient of defaultPatients) {
    if (!state.has(patient.id)) {
      const initialReading = createInitialReading(patient);
      state.set(patient.id, initialReading);
    }
  }
}

async function emitBatch() {
  if (!streaming) return;

  // Ensure patients are initialized
  initializePatients();

  for (const [patientId, previous] of state) {
    const reading = synthesize(previous, scenario);
    state.set(patientId, reading);

    await fetch(`${vitalsUrl}/vitals/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-device-token': createId('device_session') },
      body: JSON.stringify(reading)
    }).catch(() => undefined);
  }
}

function startAutoEmit() {
  if (autoStartInterval) return;
  
  const intervalMs = parseInt(process.env.IOT_INTERVAL_MS ?? '1800', 10);
  
  // Register patients first (async, don't wait)
  registerPatients().then(() => {
    initializePatients();
    
    autoStartInterval = setInterval(() => {
      emitBatch();
    }, intervalMs);
    
    console.log(`${serviceName}: Auto-emit started (interval: ${intervalMs}ms)`);
  }).catch((err) => {
    console.error(`${serviceName}: Failed to start auto-emit:`, err);
  });
}

function stopAutoEmit() {
  if (autoStartInterval) {
    clearInterval(autoStartInterval);
    autoStartInterval = null;
    console.log(`${serviceName}: Auto-emit stopped`);
  }
}

const server = createServer([
  {
    method: 'GET',
    pattern: /^\/health$/,
    handler: ({ res }) => sendJson(res, 200, { ...healthResponse(serviceName), streaming, scenario })
  },
  {
    method: 'GET',
    pattern: /^\/iot\/state$|^\/state$/,
    handler: ({ res }) => sendJson(res, 200, { streaming, scenario, patients: [], readings: Array.from(state.values()) })
  },
  {
    method: 'POST',
    pattern: /^\/iot\/scenario$|^\/scenario$/,
    handler: ({ res, body }) => {
      const requested = (body as { scenario?: Scenario; streaming?: boolean }).scenario;
      if (requested && !['normal', 'gradual-deterioration', 'sudden-spike'].includes(requested)) {
        sendJson(res, 400, { error: 'invalid_scenario' });
        return;
      }
      scenario = requested ?? scenario;
      const requestedStreaming = (body as { streaming?: boolean }).streaming;
      streaming = requestedStreaming ?? streaming;
      sendJson(res, 200, { streaming, scenario });
    }
  },
  {
    method: 'POST',
    pattern: /^\/iot\/emit$|^\/emit$/,
    handler: async ({ res }) => {
      await emitBatch();
      sendJson(res, 202, { emitted: state.size, scenario });
    }
  }
]);

server.listen(port, () => {
  console.log(`${serviceName} listening on :${port}; streaming=${streaming}; scenario=${scenario}`);
  
  // Auto-start emitting vitals if enabled
  if (streaming) {
    startAutoEmit();
  }
});
