import { createId } from '../packages/shared/src/security.js';
import type { Patient, User, Device, VitalReading } from '../packages/shared/src/types.js';
import { computeRiskLevel } from '../packages/shared/src/icu.js';

const now = new Date().toISOString();

const users: User[] = [
  { id: createId('user'), email: 'dr.carter@icu.local', name: 'Dr. Maya Carter', role: 'doctor', active: true, createdAt: now, updatedAt: now },
  { id: createId('user'), email: 'nurse.lee@icu.local', name: 'Nurse Daniel Lee', role: 'nurse', active: true, createdAt: now, updatedAt: now },
  { id: createId('user'), email: 'admin@icu.local', name: 'System Admin', role: 'admin', active: true, createdAt: now, updatedAt: now }
];

const patients: Patient[] = [
  { id: createId('patient'), mrn: 'ICU-1001', name: 'Ava Thompson', age: 62, gender: 'female', bedId: 'B-01', status: 'watching', primaryDoctorId: users[0]!.id, notes: 'Post-op cardiac monitoring' },
  { id: createId('patient'), mrn: 'ICU-1002', name: 'Noah Patel', age: 48, gender: 'male', bedId: 'B-02', status: 'stable', primaryDoctorId: users[0]!.id, notes: 'Respiratory observation' }
];

const devices: Device[] = patients.map((patient, index) => ({
  id: createId('device'),
  patientId: patient.id,
  serialNumber: `MON-${1000 + index}`,
  type: 'monitor',
  status: 'online',
  lastSeenAt: now
}));

const vitals: VitalReading[] = patients.map((patient, index) => ({
  patientId: patient.id,
  deviceId: devices[index]!.id,
  timestamp: now,
  heartRate: index === 0 ? 104 : 78,
  spo2: index === 0 ? 94 : 98,
  systolic: index === 0 ? 138 : 122,
  diastolic: index === 0 ? 86 : 74,
  temperature: index === 0 ? 37.8 : 36.8
}));

const predictions = vitals.map((reading) => {
  const risk = computeRiskLevel(reading);
  return {
    patientId: reading.patientId,
    timestamp: now,
    model: 'random-forest' as const,
    riskLevel: risk.level,
    probability: Math.min(0.99, risk.score / 100),
    explanation: risk.reasons
  };
});

console.log(JSON.stringify({ users, patients, devices, vitals, predictions }, null, 2));
