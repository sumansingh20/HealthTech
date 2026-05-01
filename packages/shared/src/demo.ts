import { computeRiskLevel, randomForestLikeProbability, recommendationsFor } from './icu.js';
import { createId, hashSecret } from './security.js';
import type { Alert, CareTimelineEvent, Device, Patient, Prediction, User, VitalReading, VitalTrendPoint } from './types.js';

const now = new Date('2026-05-02T00:00:00.000Z').toISOString();

export const demoUsers: User[] = [
  {
    id: 'user_doctor_maya',
    email: 'dr.carter@icu.local',
    name: 'Dr. Maya Carter',
    role: 'doctor',
    passwordHash: hashSecret('StrongPass123!'),
    active: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'user_nurse_lee',
    email: 'nurse.lee@icu.local',
    name: 'Nurse Daniel Lee',
    role: 'nurse',
    passwordHash: hashSecret('StrongPass123!'),
    active: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'user_admin_ops',
    email: 'admin@icu.local',
    name: 'Operations Admin',
    role: 'admin',
    passwordHash: hashSecret('StrongPass123!'),
    active: true,
    createdAt: now,
    updatedAt: now
  }
];

export const demoPatients: Patient[] = [
  {
    id: 'patient_ava_thompson',
    mrn: 'ICU-1001',
    name: 'Ava Thompson',
    age: 62,
    gender: 'female',
    bedId: 'B-01',
    status: 'watching',
    primaryDoctorId: 'user_doctor_maya',
    diagnosis: 'Post-operative cardiac monitoring after CABG',
    allergies: ['Penicillin'],
    admittedAt: '2026-05-01T09:20:00.000Z',
    notes: 'Telemetry, oxygenation, and fluid balance require close observation.'
  },
  {
    id: 'patient_noah_patel',
    mrn: 'ICU-1002',
    name: 'Noah Patel',
    age: 48,
    gender: 'male',
    bedId: 'B-02',
    status: 'stable',
    primaryDoctorId: 'user_doctor_maya',
    diagnosis: 'Severe pneumonia under respiratory observation',
    allergies: [],
    admittedAt: '2026-05-01T13:10:00.000Z',
    notes: 'Improving oxygen demand after non-invasive ventilation.'
  },
  {
    id: 'patient_lina_garcia',
    mrn: 'ICU-1003',
    name: 'Lina Garcia',
    age: 71,
    gender: 'female',
    bedId: 'B-03',
    status: 'critical',
    primaryDoctorId: 'user_doctor_maya',
    diagnosis: 'Septic shock, vasopressor support',
    allergies: ['Sulfa drugs'],
    admittedAt: '2026-05-01T18:45:00.000Z',
    notes: 'Watch MAP, lactate trend, fever, and oxygenation.'
  },
  {
    id: 'patient_omar_reed',
    mrn: 'ICU-1004',
    name: 'Omar Reed',
    age: 55,
    gender: 'male',
    bedId: 'B-04',
    status: 'watching',
    primaryDoctorId: 'user_doctor_maya',
    diagnosis: 'Acute pancreatitis with evolving SIRS',
    allergies: [],
    admittedAt: '2026-05-02T01:30:00.000Z',
    notes: 'Pain control, fluid status, and inflammatory trend monitoring.'
  }
];

export const demoDevices: Device[] = demoPatients.map((patient, index) => ({
  id: `device_monitor_${index + 1}`,
  patientId: patient.id,
  serialNumber: `MON-${1001 + index}`,
  type: 'monitor',
  status: 'online',
  lastSeenAt: new Date().toISOString()
}));

export const demoVitals: VitalReading[] = [
  {
    patientId: 'patient_ava_thompson',
    deviceId: 'device_monitor_1',
    timestamp: new Date().toISOString(),
    heartRate: 106,
    spo2: 93,
    systolic: 136,
    diastolic: 84,
    temperature: 37.8
  },
  {
    patientId: 'patient_noah_patel',
    deviceId: 'device_monitor_2',
    timestamp: new Date().toISOString(),
    heartRate: 78,
    spo2: 97,
    systolic: 122,
    diastolic: 75,
    temperature: 36.9
  },
  {
    patientId: 'patient_lina_garcia',
    deviceId: 'device_monitor_3',
    timestamp: new Date().toISOString(),
    heartRate: 132,
    spo2: 88,
    systolic: 84,
    diastolic: 46,
    temperature: 39.1
  },
  {
    patientId: 'patient_omar_reed',
    deviceId: 'device_monitor_4',
    timestamp: new Date().toISOString(),
    heartRate: 118,
    spo2: 95,
    systolic: 148,
    diastolic: 92,
    temperature: 38.4
  }
];

export function predictionFromReading(reading: VitalReading, model: Prediction['model'] = 'random-forest'): Prediction {
  const risk = computeRiskLevel(reading);
  return {
    id: createId('prediction'),
    patientId: reading.patientId,
    timestamp: reading.timestamp,
    riskLevel: risk.level,
    probability: randomForestLikeProbability(reading),
    model,
    explanation: risk.reasons.length > 0 ? risk.reasons : ['Vitals currently within monitored ICU thresholds'],
    recommendations: recommendationsFor(reading, risk.reasons)
  };
}

export const demoPredictions = demoVitals.map((reading) => predictionFromReading(reading));

export const demoAlerts: Alert[] = demoVitals.flatMap((reading) => {
  const risk = computeRiskLevel(reading);
  if (risk.level === 'low') return [];
  return [
    {
      id: createId('alert'),
      patientId: reading.patientId,
      severity: risk.level === 'critical' ? 'critical' : 'warning',
      message: `${risk.level === 'critical' ? 'Critical' : 'Warning'} deterioration signal: ${risk.reasons[0] ?? 'abnormal trend'}`,
      createdAt: reading.timestamp
    }
  ];
});

export const demoTimeline: CareTimelineEvent[] = [
  {
    id: createId('event'),
    patientId: 'patient_ava_thompson',
    type: 'admission',
    title: 'Admitted to ICU',
    description: 'Transferred after cardiac surgery for telemetry monitoring.',
    createdAt: '2026-05-01T09:20:00.000Z',
    createdBy: 'user_doctor_maya'
  },
  {
    id: createId('event'),
    patientId: 'patient_lina_garcia',
    type: 'alert',
    title: 'Escalation Review',
    description: 'AI risk model identified shock physiology pattern and oxygenation decline.',
    severity: 'critical',
    createdAt: '2026-05-02T02:10:00.000Z',
    createdBy: 'system'
  }
];

export function makeTrend(reading: VitalReading, points = 18): VitalTrendPoint[] {
  return Array.from({ length: points }, (_, index) => {
    const timestamp = new Date(Date.now() - (points - index) * 60_000).toISOString();
    const drift = index - points / 2;
    const trendReading: VitalReading = {
      ...reading,
      timestamp,
      heartRate: Math.round(reading.heartRate + Math.sin(index / 2) * 4 + drift * 0.3),
      spo2: Math.max(78, Math.min(100, Number((reading.spo2 + Math.cos(index / 3) * 1.4 - drift * 0.04).toFixed(1)))),
      systolic: Math.round(reading.systolic + Math.sin(index / 3) * 5 - drift * 0.25),
      diastolic: Math.round(reading.diastolic + Math.cos(index / 2) * 3 - drift * 0.1),
      temperature: Number((reading.temperature + Math.sin(index / 4) * 0.18 + drift * 0.01).toFixed(1))
    };
    return {
      ...trendReading,
      riskScore: computeRiskLevel(trendReading).score
    };
  });
}
