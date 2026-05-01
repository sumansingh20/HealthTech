export type RiskLevel = 'low' | 'medium' | 'critical';
export type AlertSeverity = 'normal' | 'warning' | 'critical';
export type PatientStatus = 'stable' | 'watching' | 'critical';

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
}

export interface DashboardPatient extends Patient {
  latestVitals?: VitalReading | undefined;
  latestPrediction?: Prediction | undefined;
  activeAlerts: Alert[];
  timeline: Array<{ id: string; title: string; description: string; createdAt: string; severity?: AlertSeverity | undefined }>;
  trend: Array<VitalReading & { riskScore: number }>;
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
