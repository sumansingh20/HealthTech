import { z } from 'zod';

export const roleSchema = z.enum(['doctor', 'nurse', 'admin']);
export const riskLevelSchema = z.enum(['low', 'medium', 'critical']);
export const alertSeveritySchema = z.enum(['normal', 'warning', 'critical']);
export const patientStatusSchema = z.enum(['stable', 'watching', 'critical']);

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(2),
  role: roleSchema,
  passwordHash: z.string().optional(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const createUserSchema = loginSchema.extend({
  name: z.string().min(2),
  role: roleSchema
});

export const patientSchema = z.object({
  id: z.string(),
  mrn: z.string(),
  name: z.string(),
  age: z.number().int().positive(),
  gender: z.enum(['male', 'female', 'other']),
  bedId: z.string(),
  status: patientStatusSchema,
  primaryDoctorId: z.string(),
  diagnosis: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  admittedAt: z.string().optional(),
  notes: z.string().optional()
});

export const createPatientSchema = patientSchema.omit({ id: true }).partial({
  status: true,
  notes: true,
  diagnosis: true,
  allergies: true,
  admittedAt: true
});

export const deviceSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  serialNumber: z.string(),
  type: z.enum(['monitor', 'ecg', 'spo2', 'nibp', 'temperature']),
  status: z.enum(['online', 'offline', 'maintenance']),
  lastSeenAt: z.string().optional()
});

export const vitalReadingSchema = z.object({
  patientId: z.string(),
  deviceId: z.string(),
  timestamp: z.string(),
  heartRate: z.number().min(0).max(250),
  spo2: z.number().min(0).max(100),
  systolic: z.number().min(0).max(300),
  diastolic: z.number().min(0).max(200),
  temperature: z.number().min(30).max(45)
});

export const predictionSchema = z.object({
  patientId: z.string(),
  timestamp: z.string(),
  riskLevel: riskLevelSchema,
  probability: z.number().min(0).max(1),
  model: z.enum(['logistic-regression', 'random-forest', 'lstm']),
  explanation: z.array(z.string()),
  recommendations: z.array(z.string()).optional()
});

export const alertSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  severity: alertSeveritySchema,
  message: z.string(),
  createdAt: z.string(),
  acknowledgedAt: z.string().optional(),
  acknowledgedBy: z.string().optional()
});

export const timelineEventSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  type: z.enum(['admission', 'vitals', 'prediction', 'alert', 'medication', 'handoff', 'note']),
  title: z.string(),
  description: z.string(),
  severity: alertSeveritySchema.optional(),
  createdAt: z.string(),
  createdBy: z.string().optional()
});

export const auditLogSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  actorRole: roleSchema,
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().optional(),
  ipAddress: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string()
});
