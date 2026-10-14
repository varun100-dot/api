import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { createTestDatabase } from './setup.js';
import { hashPassword } from '../src/server/utils/crypto.js';
import { CSRF_HEADER_NAME } from '../src/server/middleware/csrf.js';

describe('Security Controls & Administrative Protection', () => {
  let app: any;
  let db: any;
  let csrfToken: string;
  let csrfCookie: string;

  beforeEach(async () => {
    db = createTestDatabase();
    app = createApp(db);

    // Seed test admin
    const passwordHash = await hashPassword('AdminSecurePass2026!');
    db.prepare(`
      INSERT INTO admins (username, email, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `).run('secadmin', 'admin@digitons.com', passwordHash, new Date().toISOString());

    const tokenRes = await request(app).get('/api/csrf-token');
    csrfToken = tokenRes.body.csrfToken;
    const cookieHeader = tokenRes.headers['set-cookie'];
    csrfCookie = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader as unknown as string);
  });

  it('enforces CSRF protection on mutating POST requests', async () => {
    // Attempt POST without CSRF header
    const res = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Hacker',
        customerEmail: 'hacker@example.com',
        domain: 'hacker.com',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('CSRF');
  });

  it('blocks unauthenticated access to admin protected endpoints', async () => {
    const ordersRes = await request(app).get('/api/admin/orders');
    expect(ordersRes.status).toBe(401);
    expect(ordersRes.body.error).toBe('Unauthorized');

    const licensesRes = await request(app).get('/api/admin/licenses');
    expect(licensesRes.status).toBe(401);

    const auditRes = await request(app).get('/api/admin/audit-logs');
    expect(auditRes.status).toBe(401);
  });

  it('authenticates admin and issues secure session cookie', async () => {
    const loginRes = await request(app)
      .post('/api/admin/login')
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        username: 'secadmin',
        password: 'AdminSecurePass2026!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.admin.username).toBe('secadmin');

    const sessionCookie = loginRes.headers['set-cookie'];
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie[0]).toContain('digitons_admin_session');
    expect(sessionCookie[0]).toContain('HttpOnly');

    // Access admin protected route with session cookie
    const ordersRes = await request(app)
      .get('/api/admin/orders')
      .set('Cookie', sessionCookie);

    expect(ordersRes.status).toBe(200);
    expect(ordersRes.body).toHaveProperty('orders');
  });

  it('rejects path traversal attacks on proof files endpoint', async () => {
    // Login as admin first
    const loginRes = await request(app)
      .post('/api/admin/login')
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        username: 'secadmin',
        password: 'AdminSecurePass2026!',
      });

    const sessionCookie = loginRes.headers['set-cookie'];

    const traversalRes = await request(app)
      .get('/api/admin/proofs/../../package.json')
      .set('Cookie', sessionCookie);

    // Should return 400 or 404 (strictly blocked by regex pattern matching)
    expect([400, 404]).toContain(traversalRes.status);
  });
});
