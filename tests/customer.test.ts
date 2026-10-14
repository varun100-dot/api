import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { createTestDatabase } from './setup.js';
import { CSRF_HEADER_NAME } from '../src/server/middleware/csrf.js';
import { approvePayment } from '../src/server/services/license.service.js';
import { createOrder, submitPaymentVerification } from '../src/server/services/order.service.js';

describe('Customer Single-Page Portal, Days Left, and Bills', () => {
  let app: any;
  let db: any;
  let csrfToken: string;
  let csrfCookie: string;

  beforeEach(async () => {
    db = createTestDatabase();
    app = createApp(db);

    const tokenRes = await request(app).get('/api/csrf-token');
    csrfToken = tokenRes.body.csrfToken;
    const cookieHeader = tokenRes.headers['set-cookie'];
    csrfCookie = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader as unknown as string);
  });

  it('registers customer account and issues session cookie', async () => {
    const res = await request(app)
      .post('/api/customer/register')
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        name: 'Amit Kumar',
        email: 'amit@example.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.customer.name).toBe('Amit Kumar');
    expect(res.body.customer.email).toBe('amit@example.com');

    const sessionCookie = res.headers['set-cookie'];
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie[0]).toContain('digitons_customer_session');
  });

  it('calculates days left accurately and formats official bill upon payment approval', async () => {
    // 1. Register customer
    const regRes = await request(app)
      .post('/api/customer/register')
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        name: 'Sneha Roy',
        email: 'sneha@fintech.in',
        password: 'SecurePassword123!',
      });

    const custSession = regRes.headers['set-cookie'][0];

    // Seed admin for approval FK
    db.prepare(`
      INSERT INTO admins (id, username, email, password_hash, created_at)
      VALUES (1, 'approver', 'admin@test.com', 'scrypt$fake$hash', datetime('now'))
    `).run();

    // 2. Create order and submit payment
    const order = createOrder(db, {
      customerName: 'Sneha Roy',
      customerEmail: 'sneha@fintech.in',
      domain: 'app.fintech.in',
    });

    submitPaymentVerification(db, {
      orderRef: order.order_ref,
      utrReference: 'UTR998877665544',
    });

    // 3. Admin approves payment
    approvePayment(db, order.id, 1);

    // 4. Fetch customer profile (/api/customer/me)
    const profileRes = await request(app)
      .get('/api/customer/me')
      .set('Cookie', `${csrfCookie}; ${custSession}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.customer.email).toBe('sneha@fintech.in');

    // Verify Days Left calculation (should be 365 or 366 days)
    expect(profileRes.body.licenses).toHaveLength(1);
    const lic = profileRes.body.licenses[0];
    expect(lic.domain).toBe('app.fintech.in');
    expect(lic.daysLeft).toBeGreaterThanOrEqual(364);
    expect(lic.daysLeft).toBeLessThanOrEqual(366);
    expect(lic.isExpired).toBe(false);

    // Verify Official Invoice & Bill structure with 18% Tax
    expect(profileRes.body.invoices).toHaveLength(1);
    const inv = profileRes.body.invoices[0];
    expect(inv.invoiceNumber).toBe(`INV-${order.order_ref}`);
    expect(inv.seller.brand).toBe('API Section');
    expect(inv.seller.upiId).toBe('varunchauhan1998@ybl');
    expect(inv.subtotalINR).toBe(2965.25);
    expect(inv.taxAmountINR).toBe(533.75);
    expect(inv.taxRate).toBe('18% GST');
    expect(inv.cgstINR).toBe(266.88);
    expect(inv.sgstINR).toBe(266.87);
    expect(inv.totalAmountINR).toBe(3499);
    expect(inv.paymentStatus).toBe('Verified & Paid');
    expect(inv.utrReference).toBe('UTR998877665544');
  });
});
