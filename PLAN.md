# AI ICU Patient Monitoring System - Implementation Plan

## Information Gathered

### Current Architecture Overview:
- **Microservices**: Auth, Patient, Vitals, IoT, ML, Notifications, Analytics, Audit, API Gateway
- **Frontend**: Next.js 15 with Tailwind CSS, Framer Motion, Zustand, Three.js
- **Database**: MongoDB (local container or Atlas), Redis for pub/sub
- **Real-time**: WebSocket streaming via vitals-service
- **AI/ML**: Python FastAPI with sklearn (Logistic Regression, Random Forest, LSTM-style)
- **IoT Engine**: Continuous vital sign generator with anomaly injection

### MongoDB Atlas Configuration:
- **Connection String**: `mongodb+srv://sumantech:sumantech@cluster0.1enfs6w.mongodb.net/`
- **Database Name**: icu
- Already configured in docker-compose.yml via MONGODB_ATLAS_URI / MONGODB_URI environment variables

### Current Services Status:
1. ✅ Auth Service - JWT with RBAC
2. ✅ Patient Service - CRUD + aggregation
3. ✅ Vitals Service - WebSocket + real-time streaming
4. ✅ IoT Engine - Multi-patient vital simulation
5. ✅ ML Service - FastAPI with trained models
6. ✅ Notifications - Alert queues
7. ✅ Analytics - Trends + PDF reports
8. ✅ Audit - Compliance logging
9. ✅ API Gateway - Proxy to all services
10. ✅ Frontend - Dashboard with real-time updates

## Plan: Implementation Steps

### Phase 1: Update MongoDB Atlas Connection
1. Update docker-compose.yml to set the Atlas environment variable
2. Add MongoDB connection string to all required services
3. Configure service discovery for cross-service communication

### Phase 2: Backend Services Updates
1. Update Auth service to use MongoDB for user storage
2. Update Patient service to persist data to MongoDB
3. Update Vitals service for MongoDB time-series storage
4. Configure Redis for pub/sub in production mode

### Phase 3: Frontend Environment Configuration
1. Update next.config.mjs for Vercel deployment
2. Configure environment variables for production
3. Update API URLs for Vercel serverless functions

### Phase 4: Deployment Configuration
1. Create Vercel configuration
2. Update Dockerfile configurations
3. Set up production build process

## Implementation Dependencies:
- Auth Service: packages/shared/src/security.ts for JWT functions
- Patient Service: packages/shared/src/schemas.ts for data validation
- Vitals Service: packages/shared/src/icu.ts for risk computation
- Frontend: apps/web/lib/store.ts for Zustand state management

## Follow-up Steps After Editing:
1. Run local Docker build test: `docker-compose up --build`
2. Test MongoDB Atlas connection
3. Test real-time WebSocket streaming
4. Test AI/ML prediction endpoint
5. Deploy to Vercel
6. Verify production environment

---
Plan Created: 2026-05-02
