import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import {
  demoAlerts,
  demoPatients,
  demoPredictions,
  demoVitals,
  healthResponse,
  makeTrend,
  sendJson,
  serviceUrl
} from '@icu/shared';

const serviceName = 'api-gateway';
const port = Number(process.env.PORT ?? 4000);

const services = {
  auth: serviceUrl('AUTH_SERVICE_URL', 'http://localhost:4001'),
  patient: serviceUrl('PATIENT_SERVICE_URL', 'http://localhost:4002'),
  vitals: serviceUrl('VITALS_SERVICE_URL', 'http://localhost:4003'),
  notifications: serviceUrl('NOTIFICATION_SERVICE_URL', 'http://localhost:4006'),
  analytics: serviceUrl('ANALYTICS_SERVICE_URL', 'http://localhost:4007'),
  audit: serviceUrl('AUDIT_SERVICE_URL', 'http://localhost:4008')
};

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function proxy(req: IncomingMessage, res: ServerResponse, targetBase: string, targetPath: string) {
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);
  const init: RequestInit = {
    method: req.method ?? 'GET',
    headers: {
      'content-type': req.headers['content-type'] ?? 'application/json',
      authorization: req.headers.authorization ?? ''
    }
  };
  if (body) {
    init.body = body;
  }

  const response = await fetch(`${targetBase}${targetPath}`, init).catch((error: unknown) => {
    throw new Error(error instanceof Error ? error.message : 'Proxy request failed');
  });

  const contentType = response.headers.get('content-type') ?? 'application/json';
  res.statusCode = response.status;
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type,authorization');
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('content-type', contentType);
  res.end(Buffer.from(await response.arrayBuffer()));
}

function dashboardFallback() {
  return {
    generatedAt: new Date().toISOString(),
    patients: demoPatients.map((patient) => {
      const latestVitals = demoVitals.find((reading) => reading.patientId === patient.id);
      const latestPrediction = demoPredictions.find((prediction) => prediction.patientId === patient.id);
      return {
        ...patient,
        latestVitals,
        latestPrediction,
        activeAlerts: demoAlerts.filter((alert) => alert.patientId === patient.id),
        timeline: [],
        trend: latestVitals ? makeTrend(latestVitals) : []
      };
    }),
    capacity: {
      beds: 12,
      occupied: demoPatients.length,
      critical: demoPatients.filter((patient) => patient.status === 'critical').length,
      warning: demoPatients.filter((patient) => patient.status === 'watching').length
    },
    alerts: demoAlerts
  };
}

const server = createHttpServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const pathname = url.pathname;

  if (method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  try {
    if (pathname === '/health') {
      sendJson(res, 200, {
        ...healthResponse(serviceName),
        upstreams: services
      });
      return;
    }

    if (pathname === '/api/dashboard') {
      const response = await fetch(`${services.patient}/dashboard`).then((item) => item.json()).catch(() => dashboardFallback());
      sendJson(res, 200, response);
      return;
    }

    if (pathname === '/api/vitals/latest') {
      const response = await fetch(`${services.vitals}/vitals/latest`).then((item) => item.json()).catch(() => ({
        readings: demoVitals,
        predictions: demoPredictions,
        alerts: demoAlerts
      }));
      sendJson(res, 200, response);
      return;
    }

    if (pathname === '/api/analytics/summary') {
      await proxy(req, res, services.analytics, '/analytics/summary');
      return;
    }

    if (pathname.startsWith('/api/analytics/')) {
      await proxy(req, res, services.analytics, pathname.replace('/api', ''));
      return;
    }

    if (pathname.startsWith('/api/auth/')) {
      await proxy(req, res, services.auth, pathname.replace('/api', ''));
      return;
    }

    if (pathname.startsWith('/api/patients')) {
      await proxy(req, res, services.patient, pathname.replace('/api', ''));
      return;
    }

    if (pathname.startsWith('/api/alerts')) {
      await proxy(req, res, services.notifications, pathname.replace('/api', ''));
      return;
    }

    if (pathname.startsWith('/api/audit')) {
      await proxy(req, res, services.audit, pathname.replace('/api/audit', ''));
      return;
    }

    sendJson(res, 404, { error: 'route_not_found', pathname });
  } catch (error) {
    sendJson(res, 502, {
      error: 'bad_gateway',
      message: error instanceof Error ? error.message : 'Upstream service unavailable'
    });
  }
});

server.listen(port, () => {
  console.log(`${serviceName} listening on :${port}`);
});
