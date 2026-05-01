import { expect, it, describe } from 'vitest';
import { createId, hashSecret, signJwt, verifyJwt, can, rolePermissions } from '../packages/shared/src/security.js';

describe('security primitives', () => {
  it('generates unique IDs with prefix', () => {
    const id1 = createId('patient');
    const id2 = createId('patient');
    
    expect(id1.startsWith('patient_')).toBe(true);
    expect(id2.startsWith('patient_')).toBe(true);
    expect(id1).not.toBe(id2);
  });

  it('produces consistent SHA-256 hashes', () => {
    const hash1 = hashSecret('test-password');
    const hash2 = hashSecret('test-password');
    const hash3 = hashSecret('different');
    
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toHaveLength(64);
  });

  it('signs and verifies valid JWT tokens', () => {
    const secret = 'test-secret-key-32-characters-long!';
    const payload = {
      sub: 'user_123',
      email: 'doctor@hospital.org',
      name: 'Dr. Test',
      role: 'doctor' as const
    };
    
    const token = signJwt(payload, secret);
    const verified = verifyJwt(token, secret);
    
    expect(verified.sub).toBe(payload.sub);
    expect(verified.email).toBe(payload.email);
    expect(verified.role).toBe('doctor');
  });

  it('rejects tokens with invalid signature', () => {
    const payload = {
      sub: 'user_123',
      email: 'doctor@hospital.org',
      name: 'Dr. Test',
      role: 'doctor' as const
    };
    
    const token = signJwt(payload, 'correct-secret');
    
    expect(() => verifyJwt(token, 'wrong-secret')).toThrow('Invalid token signature');
  });

  it('rejects malformed tokens', () => {
    expect(() => verifyJwt('not-a-valid-token', 'secret')).toThrow('Malformed token');
    expect(() => verifyJwt('', 'secret')).toThrow('Malformed token');
  });

  it('checks role permissions correctly', () => {
    expect(can('admin', 'patient:read')).toBe(true);
    expect(can('admin', 'patient:write')).toBe(true);
    expect(can('admin', 'any:permission')).toBe(true);
    
    expect(can('doctor', 'patient:read')).toBe(true);
    expect(can('doctor', 'patient:write')).toBe(true);
    expect(can('doctor', 'admin:delete')).toBe(false);
    
    expect(can('nurse', 'patient:read')).toBe(true);
    expect(can('nurse', 'patient:write')).toBe(false);
  });

  it('documents all role permissions', () => {
    expect(rolePermissions.admin).toContain('*');
    expect(rolePermissions.doctor).toContain('patient:read');
    expect(rolePermissions.nurse).toContain('vitals:read');
  });
});

describe('authentication flow', () => {
  it('handles complete login flow', () => {
    const secret = 'test-secret-for-login-flow-123';
    const user = {
      sub: 'user_doctor_1',
      email: 'dr.test@hospital.org',
      name: 'Dr. Test User',
      role: 'doctor' as const
    };
    
    // Sign token
    const token = signJwt(user, secret);
    
    // Verify token
    const verified = verifyJwt(token, secret);
    
    // Check permissions
    expect(can(verified.role, 'patient:read')).toBe(true);
    expect(can(verified.role, 'alert:write')).toBe(true);
    expect(can(verified.role, 'report:export')).toBe(true);
  });
});
