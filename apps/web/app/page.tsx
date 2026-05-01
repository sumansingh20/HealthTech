'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, BellRing, BrainCircuit, DatabaseZap, LockKeyhole, RadioTower } from 'lucide-react';
import { DigitalTwinCanvas } from '../components/DigitalTwinCanvas';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="relative min-h-[92vh] overflow-hidden border-b border-icu-line">
        <div className="absolute inset-0 opacity-85">
          <DigitalTwinCanvas />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(46,232,214,.22),transparent_35%),linear-gradient(180deg,rgba(5,9,13,.52),#05090d_92%)]" />
        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-icu-cyan/40 bg-icu-cyan/10 text-icu-cyan">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-semibold">AI ICU Monitoring</span>
          </div>
          <Link href="/dashboard" className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-icu-cyan/40 bg-icu-cyan/10 px-4 text-sm font-semibold text-icu-cyan transition hover:border-icu-cyan">
            <span>Open Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
        <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-7xl items-center px-5">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.28em] text-icu-cyan">Integrated IoT + ML Critical Care</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.04] md:text-7xl">
              AI-Based Remote ICU Patient Monitoring System
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#b9cbd0]">
              Real-time vitals streaming, deterioration prediction, ICU digital twin visualization, RBAC security, audit trails, and simulated alert dispatch for critical care teams.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard" className="inline-flex h-12 items-center gap-2 rounded-[8px] bg-icu-cyan px-5 text-sm font-semibold text-black transition hover:bg-white">
                <Activity className="h-4 w-4" />
                <span>Launch Command Center</span>
              </Link>
              <a href="#architecture" className="inline-flex h-12 items-center gap-2 rounded-[8px] border border-icu-line bg-black/30 px-5 text-sm font-semibold transition hover:border-icu-cyan">
                <DatabaseZap className="h-4 w-4" />
                <span>View Architecture</span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="architecture" className="mx-auto grid max-w-7xl gap-4 px-5 py-16 md:grid-cols-2 lg:grid-cols-4">
        <Feature icon={<RadioTower />} title="Real-Time Engine" text="WebSocket telemetry, Redis pub/sub events, multi-patient streams, and instant alert fanout." />
        <Feature icon={<BrainCircuit />} title="Clinical AI" text="Logistic baseline, random forest classification, LSTM-style trend scoring, explanations, and recommendations." />
        <Feature icon={<BellRing />} title="Alerting" text="Severity queues, simulated email/SMS dispatch, emergency mode, and acknowledgement workflow." />
        <Feature icon={<LockKeyhole />} title="Healthcare Security" text="JWT authentication, doctor/nurse/admin RBAC, protected APIs, validation, and audit logging." />
      </section>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[8px] border border-icu-line bg-[var(--panel)] p-5 shadow-monitor">
      <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-icu-cyan/30 bg-icu-cyan/10 text-icu-cyan">
        {icon}
      </div>
      <h2 className="mt-5 text-lg font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{text}</p>
    </div>
  );
}
