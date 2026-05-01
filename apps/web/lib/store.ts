'use client';

import { create } from 'zustand';
import { fallbackAnalytics, fallbackSnapshot, riskFromReading } from './demo-data';
import type { Alert, AnalyticsSummary, DashboardPatient, DashboardSnapshot, Prediction, VitalReading } from './types';

interface IcuState {
  snapshot: DashboardSnapshot;
  analytics: AnalyticsSummary;
  selectedPatientId: string;
  connected: boolean;
  emergencyMode: boolean;
  theme: 'dark' | 'light';
  setSnapshot: (snapshot: DashboardSnapshot) => void;
  setAnalytics: (analytics: AnalyticsSummary) => void;
  setSelectedPatient: (patientId: string) => void;
  setConnected: (connected: boolean) => void;
  toggleEmergency: () => void;
  toggleTheme: () => void;
  applyReading: (reading: VitalReading) => void;
  applyPrediction: (prediction: Prediction) => void;
  applyAlert: (alert: Alert) => void;
}

function patientStatus(reading?: VitalReading): DashboardPatient['status'] {
  const risk = riskFromReading(reading);
  if (risk.level === 'critical') return 'critical';
  if (risk.level === 'medium') return 'watching';
  return 'stable';
}

export const useIcuStore = create<IcuState>((set) => ({
  snapshot: fallbackSnapshot,
  analytics: fallbackAnalytics,
  selectedPatientId: fallbackSnapshot.patients[0]?.id ?? '',
  connected: false,
  emergencyMode: false,
  theme: 'dark',
  setSnapshot: (snapshot) => set({ snapshot, selectedPatientId: snapshot.patients[0]?.id ?? '' }),
  setAnalytics: (analytics) => set({ analytics }),
  setSelectedPatient: (patientId) => set({ selectedPatientId: patientId }),
  setConnected: (connected) => set({ connected }),
  toggleEmergency: () => set((state) => ({ emergencyMode: !state.emergencyMode })),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  applyReading: (reading) =>
    set((state) => ({
      snapshot: {
        ...state.snapshot,
        generatedAt: new Date().toISOString(),
        patients: state.snapshot.patients.map((patient) => {
          if (patient.id !== reading.patientId) return patient;
          const risk = riskFromReading(reading);
          return {
            ...patient,
            status: patientStatus(reading),
            latestVitals: reading,
            trend: [...patient.trend.slice(-29), { ...reading, riskScore: risk.score }]
          };
        })
      }
    })),
  applyPrediction: (prediction) =>
    set((state) => ({
      snapshot: {
        ...state.snapshot,
        patients: state.snapshot.patients.map((patient) =>
          patient.id === prediction.patientId ? { ...patient, latestPrediction: prediction } : patient
        )
      }
    })),
  applyAlert: (alert) =>
    set((state) => ({
      snapshot: {
        ...state.snapshot,
        alerts: [alert, ...state.snapshot.alerts.filter((item) => item.id !== alert.id)].slice(0, 12),
        patients: state.snapshot.patients.map((patient) =>
          patient.id === alert.patientId
            ? { ...patient, activeAlerts: [alert, ...patient.activeAlerts.filter((item) => item.id !== alert.id)].slice(0, 4) }
            : patient
        )
      }
    }))
}));

export function connectVitalsSocket() {
  const url = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4003/ws';
  const socket = new WebSocket(url);
  const store = useIcuStore.getState();

  socket.addEventListener('open', () => useIcuStore.getState().setConnected(true));
  socket.addEventListener('close', () => useIcuStore.getState().setConnected(false));
  socket.addEventListener('error', () => useIcuStore.getState().setConnected(false));
  socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data as string) as {
      type?: string;
      name?: string;
      payload?: VitalReading | Prediction | Alert;
      readings?: VitalReading[];
      predictions?: Prediction[];
      alerts?: Alert[];
    };

    if (data.type === 'snapshot') {
      data.readings?.forEach((reading) => useIcuStore.getState().applyReading(reading));
      data.predictions?.forEach((prediction) => useIcuStore.getState().applyPrediction(prediction));
      data.alerts?.forEach((alert) => useIcuStore.getState().applyAlert(alert));
      return;
    }

    if (data.name === 'vitals.reading.ingested') store.applyReading(data.payload as VitalReading);
    if (data.name === 'prediction.generated') store.applyPrediction(data.payload as Prediction);
    if (data.name === 'alert.created') store.applyAlert(data.payload as Alert);
  });

  return socket;
}
