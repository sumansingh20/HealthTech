import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { parse as parseUrl } from 'node:url';
import { can, verifyJwt, type AuthPrincipal } from './security.js';

export type JsonHandler = (params: {
  req: IncomingMessage;
  res: ServerResponse;
  body: unknown;
  pathname: string;
  method: string;
  query: Record<string, string | string[] | undefined>;
  principal?: AuthPrincipal;
}) => Promise<void> | void;

export interface RouteDefinition {
  method: string;
  pattern: RegExp;
  handler: JsonHandler;
}

export function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type,authorization');
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.end(JSON.stringify(payload));
}

export function createServer(routes: RouteDefinition[]) {
  return http.createServer(async (req, res) => {
    const method = req.method ?? 'GET';
    if (method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    const parsedUrl = parseUrl(req.url ?? '/', true);
    const pathname = parsedUrl.pathname ?? '/';
    const route = routes.find((candidate) => candidate.method === method && candidate.pattern.test(pathname));

    if (!route) {
      sendJson(res, 404, { error: 'not_found', pathname });
      return;
    }

    try {
      const body = method === 'GET' || method === 'HEAD' ? {} : await readRequestBody(req);
      await route.handler({ req, res, body, pathname, method, query: parsedUrl.query });
    } catch (error) {
      sendJson(res, 500, {
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unexpected server error'
      });
    }
  });
}

export function healthResponse(service: string) {
  return {
    service,
    status: 'ok' as const,
    timestamp: new Date().toISOString()
  };
}

export function getBearerToken(req: IncomingMessage): string | undefined {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return undefined;
  return authorization.slice('Bearer '.length);
}

export function requirePrincipal(req: IncomingMessage, secret: string, permission?: string): AuthPrincipal {
  const token = getBearerToken(req);
  if (!token) throw new Error('Missing bearer token');
  const principal = verifyJwt(token, secret);
  if (permission && !can(principal.role, permission)) {
    throw new Error('Forbidden');
  }
  return principal;
}

export function matchId(pathname: string): string | undefined {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

export function serviceUrl(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}
