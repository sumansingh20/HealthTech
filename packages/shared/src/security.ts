import crypto from 'node:crypto';
import type { Role } from './types.js';

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export interface AuthPrincipal {
  sub: string;
  email: string;
  name: string;
  role: Role;
}

export const rolePermissions: Record<Role, string[]> = {
  admin: ['*'],
  doctor: ['patient:read', 'patient:write', 'vitals:read', 'alert:write', 'analytics:read', 'report:export'],
  nurse: ['patient:read', 'vitals:read', 'alert:write']
};

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signJwt(payload: AuthPrincipal, secret: string, expiresInSeconds = 60 * 60 * 8): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds
    })
  );
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token: string, secret: string): AuthPrincipal {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) {
    throw new Error('Malformed token');
  }

  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Invalid token signature');
  }

  const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AuthPrincipal & { exp: number };
  if (parsed.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return {
    sub: parsed.sub,
    email: parsed.email,
    name: parsed.name,
    role: parsed.role
  };
}

export function can(role: Role, permission: string): boolean {
  const permissions = rolePermissions[role];
  return permissions.includes('*') || permissions.includes(permission);
}
