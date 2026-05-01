import { describe, expect, it } from 'vitest';
import { computeRiskLevel } from '../packages/shared/src/icu.js';
import { createId } from '../packages/shared/src/security.js';
import { createEvent, REDIS_CHANNELS } from '../packages/shared/src/events.js';
import { databaseCollections } from '../packages/shared/src/db.js';
import { predictionFromReading } from '../packages/shared/src/demo.js';

describe('architecture primitives', () => {
  it('computes critical risk for unstable vitals', () => {
    const result = computeRiskLevel({
      patientId: createId('patient'),
      deviceId: createId('device'),
      timestamp: new Date().toISOString(),
      heartRate: 145,
      spo2: 86,
      systolic: 78,
      diastolic: 44,
      temperature: 39.2
    });

    expect(result.level).toBe('critical');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('generates explainable prediction recommendations', () => {
    const prediction = predictionFromReading({
      patientId: createId('patient'),
      deviceId: createId('device'),
      timestamp: new Date().toISOString(),
      heartRate: 132,
      spo2: 89,
      systolic: 86,
      diastolic: 48,
      temperature: 38.9
    });

    expect(prediction.riskLevel).toBe('critical');
    expect(prediction.probability).toBeGreaterThan(0.5);
    expect(prediction.recommendations?.length).toBeGreaterThan(1);
  });

  it('documents event channels and MongoDB indexes', () => {
    const event = createEvent({
      id: createId('event'),
      name: 'vitals.reading.ingested',
      source: 'test',
      payload: { ok: true }
    });

    expect(event.name).toBe('vitals.reading.ingested');
    expect(REDIS_CHANNELS.alerts).toBe('icu:alerts');
    expect(databaseCollections.vitals.indexes.some((index) => 'patientId' in index.keys && 'timestamp' in index.keys)).toBe(true);
  });
});
