import { NextRequest, NextResponse } from 'next/server';
import { healthResponse } from '@icu/shared';

export const runtime = 'nodejs';

const services = {
  auth: process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001',
  patient: process.env.PATIENT_SERVICE_URL ?? 'http://localhost:4002',
  vitals: process.env.VITALS_SERVICE_URL ?? 'http://localhost:4003',
  notifications: process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:4006',
  analytics: process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:4007',
  audit: process.env.AUDIT_SERVICE_URL ?? 'http://localhost:4008'
};

function dashboardFallback() {
  return {
    generatedAt: new Date().toISOString(),
    patients: [],
    capacity: { beds: 12, occupied: 0, critical: 0, warning: 0 },
    alerts: []
  };
}

async function proxy(req: NextRequest, targetBase: string, targetPath: string) {
  const method = req.method;
  const url = new URL(req.url);
  const search = url.search ?? '';
  const targetUrl = `${targetBase}${targetPath}${search}`;

  const headers: HeadersInit = {
    'content-type': req.headers.get('content-type') ?? 'application/json'
  };
  const authorization = req.headers.get('authorization');
  if (authorization) {
    headers.authorization = authorization;
  }

  const init: RequestInit = {
    method,
    headers,
    cache: 'no-store'
  };

  if (method !== 'GET' && method !== 'HEAD') {
    const rawBody = await req.text();
    if (rawBody.length > 0) {
      init.body = rawBody;
    }
  }

  const response = await fetch(targetUrl, init);
  const contentType = response.headers.get('content-type') ?? 'application/json';
  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      'content-type': contentType,
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type,authorization',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    }
  });
}

async function handle(req: NextRequest, segments: string[]) {
  const pathname = `/api/${segments.join('/')}`;

  if (req.method === 'OPTIONS') {
    return NextResponse.json({}, { status: 204 });
  }

  try {
    if (pathname === '/api/health') {
      return NextResponse.json({
        ...healthResponse('api-gateway-vercel'),
        upstreams: services
      });
    }

    if (pathname === '/api/dashboard') {
      try {
        const response = await fetch(`${services.patient}/dashboard`, { cache: 'no-store' });
        const payload = await response.json();
        return NextResponse.json(payload, { status: response.status });
      } catch {
        return NextResponse.json(dashboardFallback());
      }
    }

    if (pathname === '/api/vitals/latest') {
      try {
        const response = await fetch(`${services.vitals}/vitals/latest`, { cache: 'no-store' });
        const payload = await response.json();
        return NextResponse.json(payload, { status: response.status });
      } catch {
        return NextResponse.json({
          readings: [],
          predictions: [],
          alerts: []
        });
      }
    }

    if (pathname === '/api/analytics/summary') {
      return proxy(req, services.analytics, '/analytics/summary');
    }

    if (pathname.startsWith('/api/analytics/')) {
      return proxy(req, services.analytics, pathname.replace('/api', ''));
    }

    if (pathname.startsWith('/api/auth/')) {
      return proxy(req, services.auth, pathname.replace('/api', ''));
    }

    if (pathname.startsWith('/api/patients')) {
      return proxy(req, services.patient, pathname.replace('/api', ''));
    }

    if (pathname.startsWith('/api/alerts')) {
      return proxy(req, services.notifications, pathname.replace('/api', ''));
    }

    if (pathname.startsWith('/api/audit')) {
      return proxy(req, services.audit, pathname.replace('/api/audit', ''));
    }

    return NextResponse.json({ error: 'route_not_found', pathname }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'bad_gateway',
        message: error instanceof Error ? error.message : 'Upstream service unavailable'
      },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(req, path ?? []);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(req, path ?? []);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(req, path ?? []);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(req, path ?? []);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(req, path ?? []);
}

export async function OPTIONS(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(req, path ?? []);
}
