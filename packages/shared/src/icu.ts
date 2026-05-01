import type { ClinicalThresholds, RiskLevel, VitalReading } from './types.js';

export const ICU_THRESHOLDS: ClinicalThresholds = {
  heartRate: { low: 55, high: 115, criticalLow: 40, criticalHigh: 140 },
  spo2: { warning: 92, critical: 88 },
  systolic: { low: 90, high: 170, criticalLow: 75, criticalHigh: 200 },
  diastolic: { low: 50, high: 105, criticalLow: 40, criticalHigh: 120 },
  temperature: { low: 36, high: 38.2, criticalLow: 34.5, criticalHigh: 39.5 }
};

export function computeRiskLevel(reading: VitalReading): { level: RiskLevel; score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (reading.heartRate < ICU_THRESHOLDS.heartRate.criticalLow || reading.heartRate > ICU_THRESHOLDS.heartRate.criticalHigh) {
    score += 35;
    reasons.push('Heart rate in critical range');
  } else if (reading.heartRate < ICU_THRESHOLDS.heartRate.low || reading.heartRate > ICU_THRESHOLDS.heartRate.high) {
    score += 25;
    reasons.push('Heart rate outside expected ICU range');
  }

  if (reading.spo2 < ICU_THRESHOLDS.spo2.critical) {
    score += 40;
    reasons.push('Oxygen saturation in critical range');
  } else if (reading.spo2 < ICU_THRESHOLDS.spo2.warning) {
    score += 28;
    reasons.push('Oxygen saturation below threshold');
  }

  if (
    reading.systolic < ICU_THRESHOLDS.systolic.criticalLow ||
    reading.systolic > ICU_THRESHOLDS.systolic.criticalHigh ||
    reading.diastolic < ICU_THRESHOLDS.diastolic.criticalLow ||
    reading.diastolic > ICU_THRESHOLDS.diastolic.criticalHigh
  ) {
    score += 35;
    reasons.push('Blood pressure in critical range');
  } else if (
    reading.systolic < ICU_THRESHOLDS.systolic.low ||
    reading.systolic > ICU_THRESHOLDS.systolic.high ||
    reading.diastolic < ICU_THRESHOLDS.diastolic.low ||
    reading.diastolic > ICU_THRESHOLDS.diastolic.high
  ) {
    score += 25;
    reasons.push('Blood pressure instability detected');
  }

  if (reading.temperature < ICU_THRESHOLDS.temperature.criticalLow || reading.temperature > ICU_THRESHOLDS.temperature.criticalHigh) {
    score += 30;
    reasons.push('Temperature in critical range');
  } else if (reading.temperature < ICU_THRESHOLDS.temperature.low || reading.temperature > ICU_THRESHOLDS.temperature.high) {
    score += 20;
    reasons.push('Temperature trend abnormal');
  }

  const level: RiskLevel = score >= 60 ? 'critical' : score >= 30 ? 'medium' : 'low';
  return { level, score: Math.min(score, 100), reasons };
}

export function deriveAlertSeverity(score: number): 'normal' | 'warning' | 'critical' {
  if (score >= 60) return 'critical';
  if (score >= 30) return 'warning';
  return 'normal';
}

export function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

export function logisticDeteriorationProbability(reading: VitalReading): number {
  const oxygenLoad = (94 - reading.spo2) * 0.18;
  const hrLoad = Math.abs(reading.heartRate - 82) * 0.025;
  const bpLoad = Math.max(0, 92 - reading.systolic) * 0.06 + Math.max(0, reading.systolic - 160) * 0.025;
  const tempLoad = Math.abs(reading.temperature - 37) * 0.4;
  return Number(sigmoid(-2.15 + oxygenLoad + hrLoad + bpLoad + tempLoad).toFixed(3));
}

export function randomForestLikeProbability(reading: VitalReading): number {
  const risk = computeRiskLevel(reading);
  const oxygenVote = reading.spo2 < 88 ? 0.95 : reading.spo2 < 92 ? 0.72 : 0.18;
  const perfusionVote = reading.systolic < 90 || reading.diastolic < 50 ? 0.86 : reading.systolic > 170 ? 0.68 : 0.22;
  const cardiacVote = reading.heartRate > 130 || reading.heartRate < 45 ? 0.88 : reading.heartRate > 115 ? 0.61 : 0.2;
  const tempVote = reading.temperature > 39 || reading.temperature < 35.5 ? 0.76 : reading.temperature > 38.2 ? 0.48 : 0.16;
  return Number(((oxygenVote * 0.34 + perfusionVote * 0.28 + cardiacVote * 0.24 + tempVote * 0.14 + risk.score / 100) / 2).toFixed(3));
}

export function lstmTrendProbability(history: VitalReading[]): number {
  if (history.length === 0) return 0.1;
  const recent = history.slice(-8);
  const first = recent[0]!;
  const last = recent[recent.length - 1]!;
  const spo2Slope = first.spo2 - last.spo2;
  const hrSlope = last.heartRate - first.heartRate;
  const pressureSlope = first.systolic - last.systolic;
  const tempSlope = last.temperature - first.temperature;
  return Number(sigmoid(-2 + spo2Slope * 0.22 + hrSlope * 0.035 + pressureSlope * 0.05 + tempSlope * 0.8).toFixed(3));
}

export function recommendationsFor(reading: VitalReading, reasons: string[]): string[] {
  const recommendations = new Set<string>();

  if (reading.spo2 < ICU_THRESHOLDS.spo2.warning) {
    recommendations.add('Verify oxygen delivery, probe position, airway status, and notify respiratory therapy.');
  }

  if (reading.systolic < ICU_THRESHOLDS.systolic.low) {
    recommendations.add('Assess perfusion, recent medications, fluid balance, and prepare hypotension protocol.');
  }

  if (reading.heartRate > ICU_THRESHOLDS.heartRate.high || reading.heartRate < ICU_THRESHOLDS.heartRate.low) {
    recommendations.add('Review rhythm strip, pain/sedation state, electrolytes, and escalation criteria.');
  }

  if (reading.temperature > ICU_THRESHOLDS.temperature.high || reading.temperature < ICU_THRESHOLDS.temperature.low) {
    recommendations.add('Recheck core temperature and evaluate sepsis or warming/cooling interventions.');
  }

  if (reasons.length === 0) {
    recommendations.add('Continue standard monitoring and trend review.');
  }

  return Array.from(recommendations);
}

export function makeEcgWaveform(points = 120): number[] {
  return Array.from({ length: points }, (_, index) => {
    const phase = index % 30;
    if (phase === 4) return 0.22;
    if (phase === 5) return -0.62;
    if (phase === 6) return 1;
    if (phase === 7) return -0.34;
    if (phase > 12 && phase < 18) return 0.18 * Math.sin((phase - 12) / 6 * Math.PI);
    return 0.04 * Math.sin(index / 2);
  });
}
