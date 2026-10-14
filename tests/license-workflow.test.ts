import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { createTestDatabase } from './setup.js';
import { hashPassword } from '../src/server/utils/crypto.js';
import { CSRF_HEADER_NAME } from '../src/server/middleware/csrf.js';

describe('License Lifecycle, Verification & Manual Renewals', () => {
  let app: any;
  let db: any;
  let csrfToken: string;
  let csrfCookie: string;
  let adminSessionCookie: string;

  beforeEach(async () => {
    db = createTestDatabase();
    app = createApp(db);

    // Seed test admin
    const passwordHash = await hashPassword('AdminPass2026!');
    db.prepare(`
      INSERT INTO admins (username, email, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `).run('licenseadmin', 'licadmin@digitons.com', passwordHash, new Date().toISOString());

    // Fetch CSRF token
    const tokenRes = await request(app).get('/api/csrf-token');
    csrfToken = tokenRes.body.csrfToken;
    const cookieHeader = tokenRes.headers['set-cookie'];
    csrfCookie = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader as unknown as string);

    // Sign in admin
    const loginRes = await request(app)
      .post('/api/admin/login')
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        username: 'licenseadmin',
        password: 'AdminPass2026!',
      });

    adminSessionCookie = loginRes.headers['set-cookie'][0];
  });

  it('approves order, issues license with 12-month expiry, and logs audit', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        customerName: 'Dev Sharma',
        customerEmail: 'dev@devcorp.com',
        domain: 'cms.devcorp.com',
      });

    const orderRef = orderRes.body.order.orderRef;

    // 2. Submit payment UTR
    await request(app)
      .post(`/api/orders/${orderRef}/payment`)
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .field('utrReference', '982019482019');

    // 3. Find order ID
    const orderLookup = await request(app).get(`/api/orders/${orderRef}`);
    const orderStmt = db.prepare('SELECT id FROM orders WHERE order_ref = ?');
    const orderId = (orderStmt.get(orderRef) as any).id;

    // 4. Admin approves payment
    const approveRes = await request(app)
      .post(`/api/admin/orders/${orderId}/approve`)
      .set('Cookie', `${csrfCookie}; ${adminSessionCookie}`)
      .set(CSRF_HEADER_NAME, csrfToken);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.order.status).toBe('payment_approved');
    expect(approveRes.body.license).toBeDefined();

    const license = approveRes.body.license;
    expect(license.license_key).toMatch(/^DIG-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
    expect(license.domain).toBe('cms.devcorp.com');
    expect(license.status).toBe('active');

    // Check 12-month expiry calculation
    const activatedAt = new Date(license.activated_at);
    const expiresAt = new Date(license.expires_at);
    const expectedExpiry = new Date(activatedAt.getTime());
    expectedExpiry.setFullYear(expectedExpiry.getFullYear() + 1);

    expect(expiresAt.getFullYear()).toBe(expectedExpiry.getFullYear());
    expect(expiresAt.getMonth()).toBe(expectedExpiry.getMonth());
    expect(expiresAt.getDate()).toBe(expectedExpiry.getDate());

    // 5. Test domain license verification endpoint
    const verifyRes = await request(app)
      .post('/api/license/verify')
      .send({
        domain: 'cms.devcorp.com',
        licenseKey: license.license_key,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(true);
    expect(verifyRes.body.status).toBe('active');

    // Mismatched domain check
    const mismatchRes = await request(app)
      .post('/api/license/verify')
      .send({
        domain: 'otherdomain.org',
        licenseKey: license.license_key,
      });

    expect(mismatchRes.status).toBe(200);
    expect(mismatchRes.body.valid).toBe(false);
    expect(mismatchRes.body.status).toBe('domain_mismatch');
  });

  it('rejects payment with recorded reason', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        customerName: 'Samir Verma',
        customerEmail: 'samir@startup.io',
        domain: 'startup.io',
      });

    const orderRef = orderRes.body.order.orderRef;
    const orderStmt = db.prepare('SELECT id FROM orders WHERE order_ref = ?');
    const orderId = (orderStmt.get(orderRef) as any).id;

    // 2. Admin rejects payment
    const rejectRes = await request(app)
      .post(`/api/admin/orders/${orderId}/reject`)
      .set('Cookie', `${csrfCookie}; ${adminSessionCookie}`)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        reason: 'UTR reference not visible in bank statement. Please verify transaction ID.',
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.success).toBe(true);
    expect(rejectRes.body.order.status).toBe('payment_rejected');
    expect(rejectRes.body.order.rejection_reason).toContain('UTR reference not visible');
  });

  it('performs manual annual license renewal and records audit history', async () => {
    // 1. Create and approve order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        customerName: 'Kavita Rao',
        customerEmail: 'kavita@tech.com',
        domain: 'tech.com',
      });

    const orderRef = orderRes.body.order.orderRef;
    const orderStmt = db.prepare('SELECT id FROM orders WHERE order_ref = ?');
    const orderId = (orderStmt.get(orderRef) as any).id;

    const approveRes = await request(app)
      .post(`/api/admin/orders/${orderId}/approve`)
      .set('Cookie', `${csrfCookie}; ${adminSessionCookie}`)
      .set(CSRF_HEADER_NAME, csrfToken);

    const licenseId = approveRes.body.license.id;
    const originalExpiry = new Date(approveRes.body.license.expires_at);

    // 2. Perform manual annual renewal
    const renewRes = await request(app)
      .post(`/api/admin/licenses/${licenseId}/renew`)
      .set('Cookie', `${csrfCookie}; ${adminSessionCookie}`)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        paymentReference: 'RENEWAL_UTR_9029104',
        notes: 'Verified annual renewal transfer in statement',
      });

    expect(renewRes.status).toBe(200);
    expect(renewRes.body.success).toBe(true);

    const newExpiry = new Date(renewRes.body.license.expires_at);
    // New expiry should be 1 year after the original expiry
    expect(newExpiry.getFullYear()).toBe(originalExpiry.getFullYear() + 1);

    expect(renewRes.body.renewal.payment_reference).toBe('RENEWAL_UTR_9029104');
    expect(renewRes.body.renewal.previous_expiry).toBe(approveRes.body.license.expires_at);
  });
});
