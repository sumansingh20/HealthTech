'use client';

import { AlertOctagon, BellRing, CheckCircle2 } from 'lucide-react';
import type { Alert, DashboardPatient } from '../lib/types';

export function AlertRail({ alerts, patients }: { alerts: Alert[]; patients: DashboardPatient[] }) {
  return (
    <section className="rounded-[8px] border border-icu-line bg-[var(--panel)] p-5 shadow-monitor">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Alert Queue</p>
          <h2 className="mt-2 text-xl font-semibold">Real-Time Escalations</h2>
        </div>
        <BellRing className="h-5 w-5 text-icu-amber" />
      </div>
      <div className="mt-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 rounded-[8px] border border-icu-line bg-black/20 p-4 text-sm text-[var(--muted)]">
            <CheckCircle2 className="h-4 w-4 text-icu-green" />
            <span>No active alerts</span>
          </div>
        ) : (
          alerts.map((alert) => {
            const patient = patients.find((item) => item.id === alert.patientId);
            const critical = alert.severity === 'critical';
            return (
              <div
                key={alert.id}
                className={`rounded-[8px] border p-4 ${critical ? 'animate-pulse border-icu-red bg-icu-red/10' : 'border-icu-amber/50 bg-icu-amber/10'}`}
              >
                <div className="flex items-start gap-3">
                  <AlertOctagon className={`mt-0.5 h-5 w-5 ${critical ? 'text-icu-red' : 'text-icu-amber'}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{patient?.bedId ?? 'Bed'} · {patient?.name ?? alert.patientId}</div>
                    <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{alert.message}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{new Date(alert.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
