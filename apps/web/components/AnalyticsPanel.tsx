'use client';

import { BarChart3, Thermometer } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AnalyticsSummary } from '../lib/types';
import { MiniChart } from './MiniChart';

export function AnalyticsPanel({ analytics }: { analytics: AnalyticsSummary }) {
  const burndown = analytics.alertBurndown.map((item) => item.warning + item.critical);

  return (
    <section className="rounded-[8px] border border-icu-line bg-[var(--panel)] p-5 shadow-monitor">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Analytics</p>
          <h2 className="mt-2 text-xl font-semibold">Unit Risk Intelligence</h2>
        </div>
        <BarChart3 className="h-5 w-5 text-icu-cyan" />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <RiskBox label="Low" value={analytics.riskDistribution.low} color="text-icu-green" />
        <RiskBox label="Medium" value={analytics.riskDistribution.medium} color="text-icu-amber" />
        <RiskBox label="Critical" value={analytics.riskDistribution.critical} color="text-icu-red" />
      </div>

      <div className="mt-5 h-[150px] rounded-[8px] border border-icu-line bg-black/20 p-2">
        <MiniChart values={burndown} color="#ffc857" height={120} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Average label="HR" value={`${analytics.averageVitals.heartRate} bpm`} />
        <Average label="SpO2" value={`${analytics.averageVitals.spo2}%`} />
        <Average label="BP" value={`${analytics.averageVitals.systolic}/${analytics.averageVitals.diastolic}`} />
        <Average label="Temp" value={`${analytics.averageVitals.temperature} C`} icon={<Thermometer className="h-4 w-4" />} />
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {analytics.bedUtilization.map((bed) => (
          <div key={bed.bedId} className="rounded-[6px] border border-icu-line bg-black/20 p-2">
            <div className="mb-2 text-xs text-[var(--muted)]">{bed.bedId}</div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full ${bed.status === 'critical' ? 'bg-icu-red' : bed.status === 'watching' ? 'bg-icu-amber' : 'bg-icu-green'}`}
                style={{ width: `${Math.max(8, bed.riskScore)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RiskBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-[8px] border border-icu-line bg-black/20 p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function Average({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-[6px] border border-icu-line bg-black/20 p-3">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className="flex items-center gap-2 text-sm font-semibold">{icon}{value}</span>
    </div>
  );
}
