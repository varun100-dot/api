import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateOrderReference,
  generateLicenseKey,
  generateSecureToken,
} from '../src/server/utils/crypto.js';
import { sanitizeDomain } from '../src/server/services/order.service.js';

describe('Cryptographic and Format Utilities', () => {
  it('hashes passwords and verifies them using scrypt', async () => {
    const password = 'SuperSecretAdminPassword123!';
    const hash = await hashPassword(password);

    expect(hash.startsWith('scrypt$')).toBe(true);

    const matches = await verifyPassword(password, hash);
    expect(matches).toBe(true);

    const wrongMatches = await verifyPassword('WrongPassword', hash);
    expect(wrongMatches).toBe(false);
  });

  it('generates order references with DIG-ORD-YYYYMMDD-XXXX format', () => {
    const ref = generateOrderReference();
    expect(ref).toMatch(/^DIG-ORD-\d{8}-[A-F0-9]{6}$/);
  });

  it('generates production license keys with DIG-XXXX-XXXX-XXXX-XXXX format', () => {
    const key = generateLicenseKey();
    expect(key).toMatch(/^DIG-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
  });

  it('generates secure random tokens', () => {
    const token1 = generateSecureToken(16);
    const token2 = generateSecureToken(16);
    expect(token1).toHaveLength(32);
    expect(token2).toHaveLength(32);
    expect(token1).not.toBe(token2);
  });

  it('normalizes and sanitizes website domains properly', () => {
    expect(sanitizeDomain('https://blog.mycompany.com/')).toBe('blog.mycompany.com');
    expect(sanitizeDomain('http://APP.EXAMPLE.COM:3000/path')).toBe('app.example.com');
    expect(sanitizeDomain('  myportal.org  ')).toBe('myportal.org');
  });
});
