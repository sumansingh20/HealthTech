'use client';

import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Activity, Gauge, HeartPulse, UsersRound } from 'lucide-react';
import { AlertRail } from '../../components/AlertRail';
import { AnalyticsPanel } from '../../components/AnalyticsPanel';
import { BedMap } from '../../components/BedMap';
import { DashboardHeader } from '../../components/DashboardHeader';
import { PatientCard } from '../../components/PatientCard';
import { PatientDetail } from '../../components/PatientDetail';
import { getApiBaseUrl } from '../../lib/api';
import { connectVitalsSocket, useIcuStore } from '../../lib/store';
import type { AnalyticsSummary, DashboardSnapshot } from '../../lib/types';

const apiUrl = getApiBaseUrl();

export default function DashboardPage() {
  const snapshot = useIcuStore((state) => state.snapshot);
  const analytics = useIcuStore((state) => state.analytics);
  const selectedPatientId = useIcuStore((state) => state.selectedPatientId);
  const setSnapshot = useIcuStore((state) => state.setSnapshot);
  const setAnalytics = useIcuStore((state) => state.setAnalytics);
  const emergencyMode = useIcuStore((state) => state.emergencyMode);
  const theme = useIcuStore((state) => state.theme);

  useEffect(() => {
    fetch(`${apiUrl}/api/dashboard`)
      .then((response) => response.json() as Promise<DashboardSnapshot>)
      .then(setSnapshot)
      .catch(() => undefined);
    fetch(`${apiUrl}/api/analytics/summary`)
      .then((response) => response.json() as Promise<AnalyticsSummary>)
      .then(setAnalytics)
      .catch(() => undefined);
    const socket = connectVitalsSocket();
    return () => socket.close();
  }, [setAnalytics, setSnapshot]);

  const selectedPatient = useMemo(
    () => snapshot.patients.find((patient) => patient.id === selectedPatientId) ?? snapshot.patients[0],
    [selectedPatientId, snapshot.patients]
  );
  const hasPatients = snapshot.patients.length > 0;

  return (
    <main className={`${theme === 'light' ? 'light-theme' : ''} min-h-screen bg-[var(--bg)] text-[var(--text)]`}>
      <DashboardHeader />
      {emergencyMode && (
        <div className="border-b border-icu-red bg-icu-red/15 px-4 py-3 text-center text-sm font-semibold text-icu-red">
          Emergency mode active: critical alerts are pinned and high-risk cards are visually amplified.
        </div>
      )}
      <div className="monitor-grid mx-auto max-w-[1800px] px-4 py-5 md:px-6">
        {!hasPatients && (
          <section className="mb-5 rounded-[8px] border border-icu-line bg-[var(--panel)] p-5 text-sm text-[var(--muted)] shadow-monitor">
            No patient records are available yet. Create patients and connect a live vitals source to populate the dashboard.
          </section>
        )}
        <section className="grid gap-3 md:grid-cols-4">
          <Kpi icon={<UsersRound className="h-5 w-5" />} label="Occupied Beds" value={`${snapshot.capacity.occupied}/${snapshot.capacity.beds}`} />
          <Kpi icon={<HeartPulse className="h-5 w-5" />} label="Critical Patients" value={`${snapshot.capacity.critical}`} tone="text-icu-red" />
          <Kpi icon={<Gauge className="h-5 w-5" />} label="Watching" value={`${snapshot.capacity.warning}`} tone="text-icu-amber" />
          <Kpi icon={<Activity className="h-5 w-5" />} label="Active Alerts" value={`${snapshot.alerts.length}`} tone="text-icu-cyan" />
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_420px]">
          <div>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {snapshot.patients.map((patient, index) => (
                <motion.div key={patient.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <PatientCard patient={patient} />
                </motion.div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 2xl:grid-cols-[1.15fr_.85fr]">
              <BedMap patients={snapshot.patients} />
              <AnalyticsPanel analytics={analytics} />
            </div>
          </div>
          {selectedPatient && <PatientDetail patient={selectedPatient} />}
        </section>

        <section className="mt-4">
          <AlertRail alerts={snapshot.alerts} patients={snapshot.patients} />
        </section>
      </div>
    </main>
  );
}

function Kpi({ icon, label, value, tone = 'text-icu-green' }: { icon: ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[8px] border border-icu-line bg-[var(--panel)] p-4 shadow-monitor">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <div className={tone}>{icon}</div>
      </div>
      <div className={`mt-3 text-3xl font-semibold ${tone}`}>{value}</div>
    </div>
  );
}
