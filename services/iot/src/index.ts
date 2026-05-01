import {
  createId,
  createServer,
  demoDevices,
  demoPatients,
  demoVitals,
  healthResponse,
  sendJson,
  type VitalReading
} from '@icu/shared';

type Scenario = 'normal' | 'gradual-deterioration' | 'sudden-spike';

const serviceName = 'iot-simulator';
const port = Number(process.env.PORT ?? 4005);
const vitalsUrl = process.env.VITALS_SERVICE_URL ?? 'http://localhost:4003';
const state = new Map<string, VitalReading>(demoVitals.map((reading) => [reading.patientId, reading]));
let scenario: Scenario = 'gradual-deterioration';
let streaming = process.env.IOT_AUTOSTART !== 'false';

function jitter(value: number, spread: number) {
  return value + (Math.random() - 0.5) * spread;
}

function clamp(value: number, min: number, max: number, digits = 0) {
  const clipped = Math.max(min, Math.min(max, value));
  return digits > 0 ? Number(clipped.toFixed(digits)) : Math.round(clipped);
}

function synthesize(previous: VitalReading, activeScenario: Scenario): VitalReading {
  const device = demoDevices.find((item) => item.patientId === previous.patientId);
  const patient = demoPatients.find((item) => item.id === previous.patientId);
  const criticalBias = patient?.status === 'critical' ? 1.8 : patient?.status === 'watching' ? 0.8 : 0.15;
  const spike = activeScenario === 'sudden-spike' && Math.random() < 0.28;
  const deterioration = activeScenario === 'gradual-deterioration' ? criticalBias : 0;

  return {
    patientId: previous.patientId,
    deviceId: device?.id ?? previous.deviceId,
    timestamp: new Date().toISOString(),
    heartRate: clamp(jitter(previous.heartRate, 6) + deterioration + (spike ? 28 : 0), 42, 170),
    spo2: clamp(jitter(previous.spo2, 1.5) - deterioration * 0.2 - (spike ? 7 : 0), 78, 100, 1),
    systolic: clamp(jitter(previous.systolic, 8) - deterioration * 0.8 - (spike ? 24 : 0), 65, 205),
    diastolic: clamp(jitter(previous.diastolic, 4) - deterioration * 0.4 - (spike ? 12 : 0), 36, 125),
    temperature: clamp(jitter(previous.temperature, 0.18) + deterioration * 0.025 + (spike ? 0.6 : 0), 34.2, 41.4, 1)
  };
}

async function emitBatch() {
  if (!streaming) return;

  for (const patient of demoPatients) {
    const previous = state.get(patient.id);
    if (!previous) continue;
    const reading = synthesize(previous, scenario);
    state.set(patient.id, reading);

    await fetch(`${vitalsUrl}/vitals/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-device-token': createId('device_session') },
      body: JSON.stringify(reading)
    }).catch(() => undefined);
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
    handler: ({ res }) => sendJson(res, 200, { streaming, scenario, patients: demoPatients, readings: Array.from(state.values()) })
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
      sendJson(res, 202, { emitted: demoPatients.length, scenario });
    }
  }
]);

setInterval(() => {
  void emitBatch();
}, Number(process.env.IOT_INTERVAL_MS ?? 1800));

server.listen(port, () => {
  console.log(`${serviceName} listening on :${port}; streaming=${streaming}; scenario=${scenario}`);
});
