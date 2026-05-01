import type { AnalyticsSummary, DashboardSnapshot, VitalReading } from './types';

const now = new Date().toISOString();

export const initialVitals: VitalReading[] = [
  { patientId: 'patient_ava_thompson', deviceId: 'device_monitor_1', timestamp: now, heartRate: 106, spo2: 93, systolic: 136, diastolic: 84, temperature: 37.8 },
  { patientId: 'patient_noah_patel', deviceId: 'device_monitor_2', timestamp: now, heartRate: 78, spo2: 97, systolic: 122, diastolic: 75, temperature: 36.9 },
  { patientId: 'patient_lina_garcia', deviceId: 'device_monitor_3', timestamp: now, heartRate: 132, spo2: 88, systolic: 84, diastolic: 46, temperature: 39.1 },
  { patientId: 'patient_omar_reed', deviceId: 'device_monitor_4', timestamp: now, heartRate: 118, spo2: 95, systolic: 148, diastolic: 92, temperature: 38.4 }
];

export function riskFromReading(reading?: VitalReading) {
  if (!reading) return { level: 'low' as const, score: 0 };
  let score = 0;
  if (reading.heartRate < 55 || reading.heartRate > 115) score += reading.heartRate > 130 || reading.heartRate < 45 ? 35 : 25;
  if (reading.spo2 < 92) score += reading.spo2 < 88 ? 40 : 28;
  if (reading.systolic < 90 || reading.systolic > 170 || reading.diastolic < 50 || reading.diastolic > 105) score += 25;
  if (reading.temperature < 36 || reading.temperature > 38.2) score += 20;
  return { level: score >= 60 ? ('critical' as const) : score >= 30 ? ('medium' as const) : ('low' as const), score: Math.min(score, 100) };
}

export function waveform(points = 96) {
  return Array.from({ length: points }, (_, index) => {
    const phase = index % 24;
    if (phase === 4) return 0.26;
    if (phase === 5) return -0.52;
    if (phase === 6) return 1;
    if (phase === 7) return -0.25;
    if (phase > 12 && phase < 17) return 0.15 * Math.sin((phase - 12) / 5 * Math.PI);
    return 0.04 * Math.sin(index / 2);
  });
}

const avaVitals = initialVitals[0]!;
const noahVitals = initialVitals[1]!;
const linaVitals = initialVitals[2]!;
const omarVitals = initialVitals[3]!;

function trend(reading: VitalReading) {
  return Array.from({ length: 18 }, (_, index) => {
    const next = {
      ...reading,
      timestamp: new Date(Date.now() - (18 - index) * 60_000).toISOString(),
      heartRate: Math.round(reading.heartRate + Math.sin(index / 2) * 4),
      spo2: Number((reading.spo2 + Math.cos(index / 3) * 1.2).toFixed(1)),
      systolic: Math.round(reading.systolic + Math.sin(index / 3) * 5),
      diastolic: Math.round(reading.diastolic + Math.cos(index / 2) * 3),
      temperature: Number((reading.temperature + Math.sin(index / 4) * 0.16).toFixed(1))
    };
    return { ...next, riskScore: riskFromReading(next).score };
  });
}

export const fallbackSnapshot: DashboardSnapshot = {
  generatedAt: now,
  patients: [
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
      notes: 'Telemetry, oxygenation, and fluid balance require close observation.',
      latestVitals: avaVitals,
      latestPrediction: { patientId: 'patient_ava_thompson', timestamp: now, riskLevel: 'medium', probability: 0.42, model: 'random-forest', explanation: ['Heart rate above baseline'], recommendations: ['Review rhythm strip and oxygenation trend.'] },
      activeAlerts: [{ id: 'alert_ava', patientId: 'patient_ava_thompson', severity: 'warning', message: 'Warning deterioration signal: tachycardia', createdAt: now }],
      timeline: [{ id: 'event_ava', title: 'Admitted to ICU', description: 'Transferred after cardiac surgery for telemetry monitoring.', createdAt: now }],
      trend: trend(avaVitals)
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
      latestVitals: noahVitals,
      latestPrediction: { patientId: 'patient_noah_patel', timestamp: now, riskLevel: 'low', probability: 0.11, model: 'random-forest', explanation: ['Vitals within low-risk envelope'], recommendations: ['Continue current monitoring plan.'] },
      activeAlerts: [],
      timeline: [],
      trend: trend(noahVitals)
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
      latestVitals: linaVitals,
      latestPrediction: { patientId: 'patient_lina_garcia', timestamp: now, riskLevel: 'critical', probability: 0.88, model: 'random-forest', explanation: ['SpO2 and pressure are critical'], recommendations: ['Trigger bedside clinician review and prepare emergency workflow.'] },
      activeAlerts: [{ id: 'alert_lina', patientId: 'patient_lina_garcia', severity: 'critical', message: 'Critical deterioration signal: shock physiology', createdAt: now }],
      timeline: [{ id: 'event_lina', title: 'Escalation Review', description: 'AI model identified shock physiology pattern.', severity: 'critical', createdAt: now }],
      trend: trend(linaVitals)
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
      latestVitals: omarVitals,
      latestPrediction: { patientId: 'patient_omar_reed', timestamp: now, riskLevel: 'medium', probability: 0.51, model: 'random-forest', explanation: ['Temperature and heart rate above baseline'], recommendations: ['Evaluate fever and fluid balance.'] },
      activeAlerts: [{ id: 'alert_omar', patientId: 'patient_omar_reed', severity: 'warning', message: 'Warning signal: fever and tachycardia', createdAt: now }],
      timeline: [],
      trend: trend(omarVitals)
    }
  ],
  capacity: { beds: 12, occupied: 4, critical: 1, warning: 2 },
  alerts: [
    { id: 'alert_lina', patientId: 'patient_lina_garcia', severity: 'critical', message: 'Critical deterioration signal: shock physiology', createdAt: now },
    { id: 'alert_omar', patientId: 'patient_omar_reed', severity: 'warning', message: 'Warning signal: fever and tachycardia', createdAt: now }
  ]
};

export const fallbackAnalytics: AnalyticsSummary = {
  generatedAt: now,
  riskDistribution: { low: 1, medium: 2, critical: 1 },
  averageVitals: { heartRate: 109, spo2: 93.3, systolic: 123, diastolic: 74, temperature: 38.1 },
  alertBurndown: Array.from({ length: 12 }, (_, index) => ({ hour: `${String(index).padStart(2, '0')}:00`, warning: 2 + (index % 3), critical: 1 + (index % 2) })),
  bedUtilization: fallbackSnapshot.patients.map((patient) => ({ bedId: patient.bedId, riskScore: riskFromReading(patient.latestVitals).score, status: patient.status }))
};
