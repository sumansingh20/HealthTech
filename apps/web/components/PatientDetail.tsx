'use client';

import { BrainCircuit, FileDown, ShieldAlert } from 'lucide-react';
import { riskFromReading } from '../lib/clinical';
import { getApiBaseUrl } from '../lib/api';
import type { DashboardPatient } from '../lib/types';
import { EcgWave } from './EcgWave';
import { MiniChart } from './MiniChart';

export function PatientDetail({ patient }: { patient: DashboardPatient }) {
  const risk = riskFromReading(patient.latestVitals);

  return (
    <aside className="rounded-[8px] border border-icu-line bg-[var(--panel)] p-5 shadow-monitor">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Patient Detail</p>
          <h2 className="mt-2 text-2xl font-semibold">{patient.name}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{patient.age} yrs · {patient.bedId} · {patient.mrn}</p>
        </div>
        <a
          href={`${getApiBaseUrl()}/api/analytics/reports/${patient.id}.pdf`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-icu-line bg-black/20 text-icu-cyan transition hover:border-icu-cyan"
          title="Export ICU report"
        >
          <FileDown className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-5 rounded-[8px] border border-icu-line bg-black/25">
        <EcgWave tone={risk.level === 'critical' ? 'red' : risk.level === 'medium' ? 'amber' : 'green'} height={96} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <DetailMetric label="Risk Score" value={`${risk.score}/100`} />
        <DetailMetric label="AI Probability" value={`${Math.round((patient.latestPrediction?.probability ?? 0) * 100)}%`} />
        <DetailMetric label="Systolic" value={`${patient.latestVitals?.systolic ?? '--'}`} />
        <DetailMetric label="SpO2" value={`${patient.latestVitals?.spo2 ?? '--'}%`} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <BrainCircuit className="h-4 w-4 text-icu-cyan" />
          <span>AI Recommendations</span>
        </div>
        <div className="space-y-2">
          {(patient.latestPrediction?.recommendations ?? ['Continue standard monitoring and trend review.']).map((item) => (
            <div key={item} className="rounded-[6px] border border-icu-line bg-black/20 p-3 text-sm text-[var(--muted)]">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <ShieldAlert className="h-4 w-4 text-icu-amber" />
          <span>Risk Trend</span>
        </div>
        <div className="h-[128px] rounded-[8px] border border-icu-line bg-black/20 p-2">
          <MiniChart values={patient.trend.map((item) => item.riskScore)} color={risk.level === 'critical' ? '#ff5470' : '#2ee8d6'} />
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-3 text-sm font-medium">Care Timeline</p>
        <div className="space-y-3">
          {patient.timeline.length === 0 ? (
            <p className="rounded-[6px] border border-icu-line bg-black/20 p-3 text-sm text-[var(--muted)]">No escalation events in the active window.</p>
          ) : (
            patient.timeline.map((event) => (
              <div key={event.id} className="border-l-2 border-icu-cyan pl-3">
                <div className="text-sm font-medium">{event.title}</div>
                <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{event.description}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[6px] border border-icu-line bg-black/20 p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
