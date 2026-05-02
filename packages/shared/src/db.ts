export interface CollectionSchema<T> {
  name: string;
  indexes: Array<{ keys: Record<string, 1 | -1>; unique?: boolean; ttlSeconds?: number; purpose: string }>;
  sampleDocument: T;
}

const now = '2026-05-02T00:00:00.000Z';

/**
 * MongoDB Atlas SRV Connection Configuration
 *
 * To use MongoDB Atlas, set the following environment variables:
 * - MONGODB_URI: mongodb+srv://sumantech:sumantech@cluster0.1enfs6w.mongodb.net/
 * 
 * Example connection string:
 * mongodb+srv://sumantech:sumantech@cluster0.1enfs6w.mongodb.net/
 */
export interface MongoDbConfig {
  uri: string;
  databaseName: string;
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
  };
}

/**
 * Parse MongoDB connection string to extract database name
 * @param uri - MongoDB connection string (SRV or standard)
 * @returns Object with connection details
 */
export function parseMongoDbConnection(uri: string): { isAtlas: boolean; clusterName: string; databaseName: string } {
  const isAtlas = uri.startsWith('mongodb+srv://');
  
  // Extract database name from URI
  let databaseName = 'icu';
  const dbMatch = uri.match(/\/([^/?]+)(\?|$)/);
  if (dbMatch && dbMatch[1]) {
    databaseName = dbMatch[1];
  }
  
  // Extract cluster name from SRV record
  let clusterName = '';
  const clusterMatch = uri.match(/@([^.]+)\./);
  if (clusterMatch && clusterMatch[1]) {
    clusterName = clusterMatch[1];
  }
  
  return { isAtlas, clusterName, databaseName };
}

export const databaseCollections = {
  users: {
    name: 'users',
    indexes: [
      { keys: { email: 1 }, unique: true, purpose: 'login lookup' },
      { keys: { role: 1, active: 1 }, purpose: 'RBAC administration' }
    ],
    sampleDocument: {
      id: 'user_sample_doctor',
      email: 'dr.carter@icu.local',
      name: 'Dr. Maya Carter',
      role: 'doctor',
      passwordHash: 'sha256-or-kms-backed-hash',
      active: true,
      createdAt: now,
      updatedAt: now
    }
  },
  patients: {
    name: 'patients',
    indexes: [
      { keys: { mrn: 1 }, unique: true, purpose: 'medical record lookup' },
      { keys: { bedId: 1 }, unique: true, purpose: 'ICU bed occupancy' },
      { keys: { primaryDoctorId: 1, status: 1 }, purpose: 'care team worklist' }
    ],
    sampleDocument: {
      id: 'patient_sample_1',
      mrn: 'ICU-1001',
      name: 'Ava Thompson',
      age: 62,
      gender: 'female',
      bedId: 'B-01',
      status: 'watching',
      primaryDoctorId: 'user_sample_doctor',
      diagnosis: 'Post-operative cardiac observation',
      allergies: ['Penicillin'],
      admittedAt: now,
      notes: 'Telemetry and oxygenation under close observation'
    }
  },
  devices: {
    name: 'devices',
    indexes: [
      { keys: { serialNumber: 1 }, unique: true, purpose: 'device inventory' },
      { keys: { patientId: 1, status: 1 }, purpose: 'active device lookup' },
      { keys: { lastSeenAt: -1 }, purpose: 'offline device detection' }
    ],
    sampleDocument: {
      id: 'device_sample_1',
      patientId: 'patient_sample_1',
      serialNumber: 'MON-1001',
      type: 'monitor',
      status: 'online',
      lastSeenAt: now
    }
  },
  vitals: {
    name: 'vitals',
    indexes: [
      { keys: { patientId: 1, timestamp: -1 }, purpose: 'patient chart timeline' },
      { keys: { timestamp: -1 }, ttlSeconds: 60 * 60 * 24 * 90, purpose: 'hot operational retention' }
    ],
    sampleDocument: {
      patientId: 'patient_sample_1',
      deviceId: 'device_sample_1',
      timestamp: now,
      heartRate: 104,
      spo2: 94,
      systolic: 138,
      diastolic: 86,
      temperature: 37.8
    }
  },
  alerts: {
    name: 'alerts',
    indexes: [
      { keys: { patientId: 1, createdAt: -1 }, purpose: 'patient alert panel' },
      { keys: { severity: 1, acknowledgedAt: 1, createdAt: -1 }, purpose: 'active emergency queue' }
    ],
    sampleDocument: {
      id: 'alert_sample_1',
      patientId: 'patient_sample_1',
      severity: 'warning',
      message: 'SpO2 below warning threshold',
      createdAt: now
    }
  },
  predictions: {
    name: 'predictions',
    indexes: [
      { keys: { patientId: 1, timestamp: -1 }, purpose: 'risk trend' },
      { keys: { model: 1, timestamp: -1 }, purpose: 'model monitoring' }
    ],
    sampleDocument: {
      id: 'prediction_sample_1',
      patientId: 'patient_sample_1',
      timestamp: now,
      riskLevel: 'medium',
      probability: 0.42,
      model: 'random-forest',
      explanation: ['Oxygen saturation slightly below patient baseline'],
      recommendations: ['Review oxygen delivery and recent respiratory notes.']
    }
  },
  logs: {
    name: 'logs',
    indexes: [
      { keys: { actorId: 1, createdAt: -1 }, purpose: 'user activity audit' },
      { keys: { action: 1, resource: 1, createdAt: -1 }, purpose: 'compliance review' }
    ],
    sampleDocument: {
      id: 'log_sample_1',
      actorId: 'user_sample_doctor',
      actorRole: 'doctor',
      action: 'patient.read',
      resource: 'patient',
      resourceId: 'patient_sample_1',
      createdAt: now
    }
  }
} satisfies Record<string, CollectionSchema<Record<string, unknown>>>;
