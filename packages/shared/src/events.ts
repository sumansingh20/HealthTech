import type { Alert, Prediction, VitalReading } from './types.js';

export type ServiceEventName =
  | 'auth.user.logged_in'
  | 'patient.created'
  | 'vitals.reading.ingested'
  | 'prediction.generated'
  | 'alert.created'
  | 'alert.acknowledged'
  | 'notification.queued'
  | 'notification.sent'
  | 'audit.logged'
  | 'patient.updated';

export interface ServiceEvent<TPayload = unknown> {
  id: string;
  name: ServiceEventName;
  source: string;
  occurredAt: string;
  payload: TPayload;
}

export interface VitalsReadingEvent extends ServiceEvent<VitalReading> {
  name: 'vitals.reading.ingested';
}

export interface PredictionEvent extends ServiceEvent<Prediction> {
  name: 'prediction.generated';
}

export interface AlertEvent extends ServiceEvent<Alert> {
  name: 'alert.created' | 'alert.acknowledged';
}

export type DomainEvent = VitalsReadingEvent | PredictionEvent | AlertEvent | ServiceEvent<Record<string, unknown>>;

export const REDIS_CHANNELS = {
  vitals: 'icu:vitals',
  predictions: 'icu:predictions',
  alerts: 'icu:alerts',
  notifications: 'icu:notifications',
  audit: 'icu:audit',
  patients: 'icu:patients'
} as const;

export function createEvent<TPayload>(params: {
  id: string;
  name: ServiceEventName;
  source: string;
  payload: TPayload;
  occurredAt?: string;
}): ServiceEvent<TPayload> {
  return {
    id: params.id,
    name: params.name,
    source: params.source,
    occurredAt: params.occurredAt ?? new Date().toISOString(),
    payload: params.payload
  };
}
