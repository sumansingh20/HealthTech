export type Role = 'doctor' | 'nurse' | 'admin';
export type RiskLevel = 'low' | 'medium' | 'critical';
export type AlertSeverity = 'normal' | 'warning' | 'critical';
export type VitalKind = 'heartRate' | 'spo2' | 'bloodPressure' | 'temperature';
export type PatientStatus = 'stable' | 'watching' | 'critical';
export type CareEventType = 'admission' | 'vitals' | 'prediction' | 'alert' | 'medication' | 'handoff' | 'note';

export interface ClinicalThresholds {
  heartRate: { low: number; high: number; criticalLow: number; criticalHigh: number };
  spo2: { warning: number; critical: number };
  systolic: { low: number; high: number; criticalLow: number; criticalHigh: number };
  diastolic: { low: number; high: number; criticalLow: number; criticalHigh: number };
  temperature: { low: number; high: number; criticalLow: number; criticalHigh: number };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash?: string | undefined;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  bedId: string;
  status: PatientStatus;
  primaryDoctorId: string;
  diagnosis?: string | undefined;
  allergies?: string[] | undefined;
  admittedAt?: string | undefined;
  notes?: string | undefined;
}

export interface Device {
  id: string;
  patientId: string;
  serialNumber: string;
  type: 'monitor' | 'ecg' | 'spo2' | 'nibp' | 'temperature';
  status: 'online' | 'offline' | 'maintenance';
  lastSeenAt?: string | undefined;
}

export interface VitalReading {
  patientId: string;
  deviceId: string;
  timestamp: string;
  heartRate: number;
  spo2: number;
  systolic: number;
  diastolic: number;
  temperature: number;
}

export interface VitalTrendPoint extends VitalReading {
  riskScore: number;
}

export interface Prediction {
  id?: string | undefined;
  patientId: string;
  timestamp: string;
  riskLevel: RiskLevel;
  probability: number;
  model: 'logistic-regression' | 'random-forest' | 'lstm';
  explanation: string[];
  recommendations?: string[] | undefined;
}

export interface Alert {
  id: string;
  patientId: string;
  severity: AlertSeverity;
  message: string;
  createdAt: string;
  acknowledgedAt?: string | undefined;
  acknowledgedBy?: string | undefined;
}

export interface CareTimelineEvent {
  id: string;
  patientId: string;
  type: CareEventType;
  title: string;
  description: string;
  severity?: AlertSeverity | undefined;
  createdAt: string;
  createdBy?: string | undefined;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: Role;
  action: string;
  resource: string;
  resourceId?: string | undefined;
  ipAddress?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
}

export interface DashboardPatient extends Patient {
  device?: Device | undefined;
  latestVitals?: VitalReading | undefined;
  latestPrediction?: Prediction | undefined;
  activeAlerts: Alert[];
  timeline: CareTimelineEvent[];
  trend: VitalTrendPoint[];
}

export interface DashboardSnapshot {
  generatedAt: string;
  patients: DashboardPatient[];
  capacity: {
    beds: number;
    occupied: number;
    critical: number;
    warning: number;
  };
  alerts: Alert[];
}

export interface AnalyticsSummary {
  generatedAt: string;
  riskDistribution: Record<RiskLevel, number>;
  averageVitals: {
    heartRate: number;
    spo2: number;
    systolic: number;
    diastolic: number;
    temperature: number;
  };
  alertBurndown: Array<{ hour: string; warning: number; critical: number }>;
  bedUtilization: Array<{ bedId: string; riskScore: number; status: PatientStatus }>;
}
