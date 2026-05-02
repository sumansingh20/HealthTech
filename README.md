# AI-Based Remote ICU Patient Monitoring System

An integrated IoT-ML remote critical care platform with a Next.js ICU command center, microservice backend, WebSocket vitals streaming, AI deterioration prediction, alert queues, audit trails, and Dockerized deployment.

## 1. Full Folder Structure

```txt
apps/web                      Next.js App Router frontend
  app                         landing page, dashboard page, global styles
  components                  ICU cards, ECG, bed map, 3D digital twin, analytics
  lib                         Zustand store, clinical helpers, frontend types
services/api-gateway          REST edge service and upstream routing
services/auth                 JWT login, RBAC identity, user context
services/patient              patient CRUD, dashboard aggregation
services/vitals               HTTP ingestion, WebSocket stream, Redis pub/sub
services/ml                   FastAPI ML prediction service
services/iot                  multi-patient ICU device simulator
services/notifications        alert queue and email/SMS simulation
services/analytics            trend analytics and PDF report export
services/audit                immutable audit log API
packages/shared               schemas, types, scoring, DB indexes, events
docker                        compose stack and Dockerfiles
tests                         architecture and clinical logic tests
scripts                       seed clinical data
```

## 2. Frontend Code

The frontend lives in `apps/web` and uses:

- Next.js App Router
- Tailwind CSS
- Framer Motion
- Three.js
- Zustand
- lucide-react icons

Key UI files:

- `apps/web/app/page.tsx`: startup-grade landing page with animated ICU digital twin hero.
- `apps/web/app/dashboard/page.tsx`: real-time ICU command center.
- `apps/web/components/PatientCard.tsx`: live patient cards with vitals and ECG.
- `apps/web/components/PatientDetail.tsx`: historical graph, AI recommendations, care timeline, PDF export.
- `apps/web/components/BedMap.tsx`: 2D bed grid plus 3D ICU digital twin.
- `apps/web/components/AlertRail.tsx`: severity-ranked alert queue.
- `apps/web/components/AnalyticsPanel.tsx`: trends, risk distribution, and heatmap-style bed utilization.
- `apps/web/lib/store.ts`: Zustand state, WebSocket client, empty-state handling.

## 3. Backend Code

Each TypeScript service is container-ready and exposes `/health`.

- `services/api-gateway`: routes `/api/*` traffic to internal services.
- `services/auth`: login, `/auth/me`, JWT signing, RBAC-ready user context.
- `services/patient`: patient CRUD and `/dashboard` aggregation.
- `services/vitals`: vitals ingestion, WebSocket fanout, Redis pub/sub, alert generation.
- `services/notifications`: alert creation, acknowledgement, simulated email/SMS outbox.
- `services/analytics`: summary analytics and generated PDF report endpoint.
- `services/audit`: compliance log ingestion and retrieval.

The shared layer in `packages/shared` contains Zod schemas, TypeScript contracts, MongoDB index metadata, JWT helpers, event names, and clinical risk scoring.

## 4. ML Service Code

`services/ml/src/main.py` implements a FastAPI model service with:

- Logistic Regression baseline
- Random Forest classifier
- LSTM-style temporal trend scoring
- Anomaly scoring endpoint
- Explainability messages and clinical recommendations

Endpoints:

- `GET /health`
- `POST /predict`
- `POST /anomaly`

## 5. IoT Simulation Code

`services/iot/src/index.ts` simulates ICU monitors for multiple patients.

Supported modes:

- `normal`
- `gradual-deterioration`
- `sudden-spike`

Endpoints:

- `GET /iot/state`
- `POST /iot/scenario`
- `POST /iot/emit`

It continuously emits physiological vitals to the vitals service:

- Heart Rate
- SpO2
- Blood Pressure
- Temperature

## 6. Database Schemas

Collections are defined in `packages/shared/src/db.ts`.

- `users`: indexed by `email`, `role`, `active`
- `patients`: indexed by `mrn`, `bedId`, `primaryDoctorId`, `status`
- `devices`: indexed by `serialNumber`, `patientId`, `status`, `lastSeenAt`
- `vitals`: indexed by `patientId + timestamp`, with TTL guidance for hot retention
- `alerts`: indexed by `patientId`, `severity`, `acknowledgedAt`, `createdAt`
- `predictions`: indexed by `patientId + timestamp`, `model + timestamp`
- `logs`: indexed by `actorId`, `action`, `resource`, `createdAt`

### MongoDB Atlas Connection

The system supports both MongoDB Atlas (SRV) and local MongoDB connections.

**Production - MongoDB Atlas (SRV):**
```bash
MONGODB_ATLAS_URI=mongodb+srv://sumantech:sumantech@cluster0.1enfs6w.mongodb.net/
```

**Development - Local MongoDB:**
```bash
MONGODB_URI=mongodb://mongo:27017/icu
```

The production connection string can be configured via `MONGODB_ATLAS_URI` or `MONGODB_URI`.
The docker-compose.yml uses environment variable substitution to support both connection types.

## 7. API Endpoints

Gateway:

- `GET /health`
- `GET /api/dashboard`
- `GET /api/vitals/latest`
- `GET /api/analytics/summary`
- `GET /api/analytics/reports/:patientId.pdf`
- `POST /api/auth/login`
- `GET /api/patients`
- `POST /api/patients`
- `PATCH /api/patients/:id`
- `GET /api/alerts`
- `POST /api/alerts/:id/ack`

Service ports:

- Web: `3000`
- API Gateway: `4000`
- Auth: `4001`
- Patient: `4002`
- Vitals/WebSocket: `4003`
- ML: `4004`
- IoT Simulator: `4005`
- Notifications: `4006`
- Analytics: `4007`
- Audit: `4008`

## 8. WebSocket Implementation

The vitals service exposes:

```txt
ws://localhost:4003/ws
```

Events:

- `vitals.reading.ingested`
- `prediction.generated`
- `alert.created`

The frontend subscribes in `apps/web/lib/store.ts` and updates cards, patient detail, alert rail, and trends without page refreshes.

## 9. Deployment Guide

Local development:

```bash
cp .env.example .env
corepack enable
pnpm install
docker compose -f docker/docker-compose.yml up redis mongo
pnpm dev
```

Full Docker stack:

```bash
docker compose -f docker/docker-compose.yml up --build
```

Production targets:

- Frontend: Vercel Next.js app
- Backend API routes: Vercel Node runtime at `/api/*` (in the same deployment)
- Optional upstream microservices: any HTTPS host (Render, Railway, Fly, etc.)
- Optional realtime WebSocket service: external host via `NEXT_PUBLIC_WS_URL`
- ML Service: separate container host
- Database: MongoDB Atlas
- Cache/events: Redis Cloud

Required production environment variables are listed in `.env.example`.

### Vercel Setup (Frontend + Backend)

1. Import this repository into Vercel.
2. Keep root as repository root (monorepo).
3. Build/install commands are already configured in `vercel.json`.
4. Add environment variables in Vercel Project Settings:
  - `MONGODB_ATLAS_URI=mongodb+srv://sumantech:sumantech@cluster0.1enfs6w.mongodb.net/`
  - `JWT_SECRET` and `JWT_REFRESH_SECRET`
  - `NEXT_PUBLIC_API_URL` left blank for same-origin API usage
  - Optional upstream URLs: `AUTH_SERVICE_URL`, `PATIENT_SERVICE_URL`, `VITALS_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`, `ANALYTICS_SERVICE_URL`, `AUDIT_SERVICE_URL`
  - Optional realtime URL: `NEXT_PUBLIC_WS_URL`
5. Deploy. Your backend endpoints are served at the same domain:
  - `/api/health`
  - `/api/dashboard`
  - `/api/vitals/latest`
  - `/api/analytics/*`, `/api/auth/*`, `/api/patients*`, `/api/alerts*`, `/api/audit*`

## 10. UI Explanation

The interface uses a hospital-grade dark monitor language with restrained SaaS layout patterns:

- Patient cards show live vitals, ECG waveform, risk score, and alerts.
- Patient detail panel shows predictions, recommendations, risk trends, and timeline.
- ICU bed map combines a 2D operational layout with a Three.js digital twin.
- Alert rail prioritizes critical alerts and supports emergency-mode visual escalation.
- Analytics panel shows risk distribution, unit-wide averages, alert trend, and bed utilization.
- Theme toggle and offline-safe handling keep the UI stable.

## 11. Data Flow Explanation

```txt
IoT Simulator
  -> POST /vitals/ingest
Vitals Service
  -> validates vitals
  -> computes risk
  -> generates prediction
  -> emits Redis events
  -> broadcasts WebSocket events
  -> posts alerts to Notification Service
Notification Service
  -> queues simulated SMS/email
API Gateway
  -> aggregates patient, vitals, alert, analytics APIs
Next.js Frontend
  -> fetches snapshot through gateway
  -> listens to WebSocket for live updates
Analytics Service
  -> reports summaries and PDF export
Audit Service
  -> records compliance activity
```

## Testing Strategy

- Unit tests: `tests/architecture.spec.ts` validates clinical scoring, predictions, events, and DB metadata.
- API tests: add Supertest/Newman suites per service for auth, patient CRUD, vitals ingestion, alert acknowledgement, and report export.
- Load testing: use k6 or Artillery against `/vitals/ingest` and `ws://localhost:4003/ws` with 100-1,000 simulated beds.
- ML validation: evaluate confusion matrix, AUROC, calibration, and false-negative review using historical labelled data.

Run tests:

```bash
pnpm test
```

Authentication:

```txt
Use a registered account from the auth service.
```
