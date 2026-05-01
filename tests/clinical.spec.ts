import { expect, it, describe } from 'vitest';
import { 
  computeRiskLevel, 
  deriveAlertSeverity,
  sigmoid,
  logisticDeteriorationProbability,
  randomForestLikeProbability,
  lstmTrendProbability,
  recommendationsFor,
  ICU_THRESHOLDS
} from '../packages/shared/src/icu.js';
import type { VitalReading } from '../packages/shared/src/types.js';

describe('clinical scoring', () => {
  it('computes critical risk for unstable vitals', () => {
    const reading: VitalReading = {
      patientId: 'patient_test',
      deviceId: 'device_test',
      timestamp: new Date().toISOString(),
      heartRate: 145,
      spo2: 86,
      systolic: 78,
      diastolic: 44,
      temperature: 39.2
    };
    
    const result = computeRiskLevel(reading);
    
    expect(result.level).toBe('critical');
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('computes low risk for normal vitals', () => {
    const reading: VitalReading = {
      patientId: 'patient_test',
      deviceId: 'device_test',
      timestamp: new Date().toISOString(),
      heartRate: 72,
      spo2: 98,
      systolic: 120,
      diastolic: 78,
      temperature: 36.8
    };
    
    const result = computeRiskLevel(reading);
    
    expect(result.level).toBe('low');
    expect(result.score).toBeLessThan(30);
    expect(result.reasons).toHaveLength(0);
  });

  it('detects medium risk for borderline vitals', () => {
    const reading: VitalReading = {
      patientId: 'patient_test',
      deviceId: 'device_test',
      timestamp: new Date().toISOString(),
      heartRate: 110,
      spo2: 91,
      systolic: 168,
      diastolic: 102,
      temperature: 38.0
    };
    
    const result = computeRiskLevel(reading);
    
    expect(result.level).toBe('medium');
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.score).toBeLessThan(60);
  });

  it('detects SpO2 critical threshold', () => {
    const reading: VitalReading = {
      patientId: 'patient_test',
      deviceId: 'device_test',
      timestamp: new Date().toISOString(),
      heartRate: 80,
      spo2: 85,
      systolic: 120,
      diastolic: 75,
      temperature: 37.0
    };
    
    const result = computeRiskLevel(reading);
    const hasSpo2Reason = result.reasons.some(r => r.toLowerCase().includes('oxygen') || r.toLowerCase().includes('spo2'));
    
    expect(hasSpo2Reason).toBe(true);
  });

  it('detects blood pressure critical threshold', () => {
    const reading: VitalReading = {
      patientId: 'patient_test',
      deviceId: 'device_test',
      timestamp: new Date().toISOString(),
      heartRate: 90,
      spo2: 97,
      systolic: 70,
      diastolic: 35,
      temperature: 37.0
    };
    
    const result = computeRiskLevel(reading);
    const hasBPReason = result.reasons.some(r => r.toLowerCase().includes('blood pressure'));
    
    expect(hasBPReason).toBe(true);
  });

  it('derives alert severity from risk score', () => {
    expect(deriveAlertSeverity(10)).toBe('normal');
    expect(deriveAlertSeverity(30)).toBe('warning');
    expect(deriveAlertSeverity(50)).toBe('warning');
    expect(deriveAlertSeverity(60)).toBe('critical');
    expect(deriveAlertSeverity(85)).toBe('critical');
  });

  it('documents clinical thresholds', () => {
    expect(ICU_THRESHOLDS.heartRate.criticalLow).toBe(40);
    expect(ICU_THRESHOLDS.heartRate.criticalHigh).toBe(140);
    expect(ICU_THRESHOLDS.spo2.critical).toBe(88);
    expect(ICU_THRESHOLDS.spo2.warning).toBe(92);
    expect(ICU_THRESHOLDS.systolic.criticalLow).toBe(75);
    expect(ICU_THRESHOLDS.temperature.criticalHigh).toBe(39.5);
  });
});

describe('probability functions', () => {
  it('computes logistic deterioration probability', () => {
    const reading: VitalReading = {
      patientId: 'patient_test',
      deviceId: 'device_test',
      timestamp: new Date().toISOString(),
      heartRate: 130,
      spo2: 85,
      systolic: 85,
      diastolic: 50,
      temperature: 39.0
    };
    
    const prob = logisticDeteriorationProbability(reading);
    
    expect(prob).toBeGreaterThan(0.5);
    expect(prob).toBeLessThanOrEqual(1);
  });

  it('computes random forest like probability', () => {
    const criticalReading: VitalReading = {
      patientId: 'patient_test',
      deviceId: 'device_test',
      timestamp: new Date().toISOString(),
      heartRate: 140,
      spo2: 82,
      systolic: 75,
      diastolic: 40,
      temperature: 39.5
    };
    
    const stableReading: VitalReading = {
      patientId: 'patient_test',
      deviceId: 'device_test',
      timestamp: new Date().toISOString(),
      heartRate: 70,
      spo2: 99,
      systolic: 115,
      diastolic: 75,
      temperature: 36.6
    };
    
    const criticalProb = randomForestLikeProbability(criticalReading);
    const stableProb = randomForestLikeProbability(stableReading);
    
    expect(criticalProb).toBeGreaterThan(stableProb);
    expect(criticalProb).toBeGreaterThan(0.5);
    expect(stableProb).toBeLessThan(0.5);
  });

  it('computes LSTM trend probability from history', () => {
    const readings: VitalReading[] = Array.from({ length: 12 }, (_, i) => ({
      patientId: 'patient_test',
      deviceId: 'device_test',
      timestamp: new Date(Date.now() - (12 - i) * 60000).toISOString(),
      heartRate: 80 + i * 3,
      spo2: 96 - i * 0.5,
      systolic: 120 - i * 2,
      diastolic: 75 - i,
      temperature: 37.0 + i * 0.02
    }));
    
    const prob = lstmTrendProbability(readings);
    
    // Declining SpO2 and BP should increase risk
    expect(prob).toBeGreaterThan(0.3);
  });

  it('returns low probability without history', () => {
    const reading: VitalReading = {
      patientId: 'patient_test',
      deviceId: 'device_test',
      timestamp: new Date().toISOString(),
      heartRate: 75,
      spo2: 98,
      systolic: 118,
      diastolic: 72,
      temperature: 36.8
    };
    
    const prob = lstmTrendProbability([]);
    
    expect(prob).toBeLessThan(0.2);
  });
});

describe('sigmoid function', () => {
  it('maps negative large values close to 0', () => {
    expect(sigmoid(-10)).toBeLessThan(0.001);
    expect(sigmoid(-5)).toBeLessThan(0.01);
  });

  it('maps positive large values close to 1', () => {
    expect(sigmoid(10)).toBeGreaterThan(0.999);
    expect(sigmoid(5)).toBeGreaterThan(0.99);
  });

  it('maps zero to 0.5', () => {
    expect(sigmoid(0)).toBe(0.5);
  });
});

describe('recommendations', () => {
  it('generates recommendations for low SpO2', () => {
    const reading: VitalReading = {
      patientId: 'patient_test',
      deviceId: 'device_test',
      timestamp: new Date().toISOString(),
      heartRate: 90,
      spo2: 85,
      systolic: 120,
      diastolic: 75,
      temperature: 37.0
    };
    
    const recommendations = recommendationsFor(reading, ['Oxygen saturation below threshold']);
    
    expect(recommendations.length).toBeGreaterThan(0);
    const hasO2Rec = recommendations.some(r => 
      r.toLowerCase().includes('oxygen') || 
      r.toLowerCase().includes('probe') ||
      r.toLowerCase().includes('airway')
    );
    expect(hasO2Rec).toBe(true);
  });

  it('generates recommendations for hypotension', () => {
    const reading: VitalReading = {
      patientId: 'patient_test',
      deviceId: 'device_test',
      timestamp: new Date().toISOString(),
      heartRate: 100,
      spo2: 97,
      systolic: 80,
      diastolic: 45,
      temperature: 37.2
    };
    
    const recommendations = recommendationsFor(reading, ['Blood pressure low']);
    
    const hasHypotensionRec = recommendations.some(r => 
      r.toLowerCase().includes('perfusion') || 
      r.toLowerCase().includes('fluid') ||
      r.toLowerCase().includes('hypotension')
    );
    expect(hasHypotensionRec).toBe(true);
  });

  it('generates recommendations for abnormal heart rate', () => {
    const reading: VitalReading = {
      patientId: 'patient_test',
      deviceId: 'device_test',
      timestamp: new Date().toISOString(),
      heartRate: 135,
      spo2: 96,
      systolic: 125,
      diastolic: 78,
      temperature: 37.0
    };
    
    const recommendations = recommendationsFor(reading, ['Heart rate elevated']);
    
    const hasHRRec = recommendations.some(r => 
      r.toLowerCase().includes('rhythm') || 
      r.toLowerCase().includes('electrolyte')
    );
    expect(hasHRRec).toBe(true);
  });

  it('returns monitoring recommendation for normal vitals', () => {
    const reading: VitalReading = {
      patientId: 'patient_test',
      deviceId: 'device_test',
      timestamp: new Date().toISOString(),
      heartRate: 72,
      spo2: 98,
      systolic: 118,
      diastolic: 75,
      temperature: 36.7
    };
    
    const recommendations = recommendationsFor(reading, []);
    
    expect(recommendations.length).toBeGreaterThan(0);
    const hasMonitoringRec = recommendations.some(r => 
      r.toLowerCase().includes('monitoring') || 
      r.toLowerCase().includes('continue')
    );
    expect(hasMonitoringRec).toBe(true);
  });
});
