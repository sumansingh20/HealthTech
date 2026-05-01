'use client';

import { Activity, AlertTriangle, HeartPulse } from 'lucide-react';
import { motion } from 'framer-motion';
import { riskFromReading } from '../lib/demo-data';
import { useIcuStore } from '../lib/store';
import type { DashboardPatient } from '../lib/types';
import { EcgWave } from './EcgWave';

const tones = {
  low: { text: 'text-icu-green', border: 'border-icu-green/30', bg: 'bg-icu-green/10', wave: 'green' as const },
  medium: { text: 'text-icu-amber', border: 'border-icu-amber/35', bg: 'bg-icu-amber/10', wave: 'amber' as const },
  critical: { text: 'text-icu-red', border: 'border-icu-red/45', bg: 'bg-icu-red/15', wave: 'red' as const }
};

export function PatientCard({ patient }: { patient: DashboardPatient }) {
  const setSelectedPatient = useIcuStore((state) => state.setSelectedPatient);
  const selectedPatientId = useIcuStore((state) => state.selectedPatientId);
  const reading = patient.latestVitals;
  const risk = riskFromReading(reading);
  const tone = tones[risk.level];
  const selected = selectedPatientId === patient.id;

  return (
    <motion.button
      type="button"
      layout
      onClick={() => setSelectedPatient(patient.id)}
      className={`relative min-h-[244px] rounded-[8px] border ${selected ? 'border-icu-cyan shadow-glow' : tone.border} bg-[var(--panel)] p-4 text-left shadow-monitor transition hover:border-icu-cyan/60`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.995 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            <span>{patient.bedId}</span>
            <span className={`h-2 w-2 rounded-full ${tone.bg} ${tone.text} pulse-ring`} />
          </div>
          <h3 className="mt-2 text-lg font-semibold leading-tight">{patient.name}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{patient.mrn} · {patient.diagnosis}</p>
        </div>
        <div className={`rounded-[8px] border ${tone.border} ${tone.bg} px-2 py-1 text-xs font-semibold uppercase ${tone.text}`}>
          {risk.level}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <Metric label="HR" value={reading?.heartRate ?? 0} unit="bpm" tone={reading && reading.heartRate > 115 ? 'text-icu-amber' : 'text-icu-green'} />
        <Metric label="SpO2" value={reading?.spo2 ?? 0} unit="%" tone={reading && reading.spo2 < 92 ? 'text-icu-red' : 'text-icu-cyan'} />
        <Metric label="BP" value={reading ? `${reading.systolic}/${reading.diastolic}` : '--'} unit="mmHg" tone={reading && reading.systolic < 90 ? 'text-icu-red' : 'text-white'} />
        <Metric label="Temp" value={reading?.temperature ?? 0} unit="C" tone={reading && reading.temperature > 38.2 ? 'text-icu-amber' : 'text-white'} />
      </div>

      <div className="mt-4 h-[76px] rounded-[8px] border border-icu-line/80 bg-black/25">
        <EcgWave tone={tone.wave} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <HeartPulse className="h-4 w-4 text-icu-green" />
          <span>{patient.latestPrediction ? `${Math.round(patient.latestPrediction.probability * 100)}% AI risk` : 'AI syncing'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          {patient.activeAlerts.length > 0 ? <AlertTriangle className="h-4 w-4 text-icu-red" /> : <Activity className="h-4 w-4 text-icu-cyan" />}
          <span>{patient.activeAlerts.length} alerts</span>
        </div>
      </div>
    </motion.button>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: number | string; unit: string; tone: string }) {
  return (
    <div className="min-w-0 rounded-[6px] border border-icu-line bg-black/20 p-2">
      <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">{label}</div>
      <div className={`mt-1 truncate text-lg font-semibold leading-none ${tone}`}>{value}</div>
      <div className="mt-1 truncate text-[10px] text-[var(--muted)]">{unit}</div>
    </div>
  );
}
