'use client';

import { Bed, RadioTower } from 'lucide-react';
import type { DashboardPatient } from '../lib/types';
import { DigitalTwinCanvas } from './DigitalTwinCanvas';

export function BedMap({ patients }: { patients: DashboardPatient[] }) {
  const beds = Array.from({ length: 12 }, (_, index) => {
    const bedId = `B-${String(index + 1).padStart(2, '0')}`;
    return patients.find((patient) => patient.bedId === bedId) ?? { bedId };
  });

  return (
    <section className="rounded-[8px] border border-icu-line bg-[var(--panel)] p-5 shadow-monitor">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">ICU Digital Twin</p>
          <h2 className="mt-2 text-xl font-semibold">North Wing Bed Map</h2>
        </div>
        <RadioTower className="h-5 w-5 text-icu-cyan" />
      </div>
      <div className="mt-4 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="h-[320px] overflow-hidden rounded-[8px] border border-icu-line bg-black/20">
          <DigitalTwinCanvas compact />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {beds.map((bed) => {
            const patient = 'id' in bed ? bed : undefined;
            const tone = patient?.status === 'critical' ? 'border-icu-red text-icu-red' : patient?.status === 'watching' ? 'border-icu-amber text-icu-amber' : patient ? 'border-icu-green text-icu-green' : 'border-icu-line text-[var(--muted)]';
            return (
              <div key={bed.bedId} className={`min-h-[76px] rounded-[8px] border ${tone} bg-black/20 p-3`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{bed.bedId}</span>
                  <Bed className="h-4 w-4" />
                </div>
                <div className="mt-3 truncate text-xs text-[var(--muted)]">{patient?.name ?? 'Available'}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
