import type { VitalReading } from './types';

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
