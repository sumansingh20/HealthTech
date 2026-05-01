'use client';

import { Activity, Moon, RadioTower, ShieldAlert, Sun } from 'lucide-react';
import { useIcuStore } from '../lib/store';

export function DashboardHeader() {
  const connected = useIcuStore((state) => state.connected);
  const emergencyMode = useIcuStore((state) => state.emergencyMode);
  const toggleEmergency = useIcuStore((state) => state.toggleEmergency);
  const toggleTheme = useIcuStore((state) => state.toggleTheme);
  const theme = useIcuStore((state) => state.theme);

  return (
    <header className="sticky top-0 z-30 border-b border-icu-line bg-[var(--bg)]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-icu-cyan/40 bg-icu-cyan/10 text-icu-cyan">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">AI ICU Command Center</h1>
            <p className="truncate text-xs text-[var(--muted)]">Remote critical care monitoring and risk intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill connected={connected} />
          <button
            type="button"
            onClick={toggleEmergency}
            className={`inline-flex h-10 items-center gap-2 rounded-[8px] border px-3 text-sm font-semibold transition ${emergencyMode ? 'border-icu-red bg-icu-red/20 text-icu-red' : 'border-icu-line bg-black/20 text-[var(--text)] hover:border-icu-red/60'}`}
            title="Toggle emergency mode"
          >
            <ShieldAlert className="h-4 w-4" />
            <span className="hidden sm:inline">Emergency</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-icu-line bg-black/20 text-[var(--text)] transition hover:border-icu-cyan"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <div className={`inline-flex h-10 items-center gap-2 rounded-[8px] border px-3 text-sm ${connected ? 'border-icu-green/40 bg-icu-green/10 text-icu-green' : 'border-icu-amber/40 bg-icu-amber/10 text-icu-amber'}`}>
      <RadioTower className="h-4 w-4" />
      <span className="hidden sm:inline">{connected ? 'Live Stream' : 'Offline Safe'}</span>
    </div>
  );
}
