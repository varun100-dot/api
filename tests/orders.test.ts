import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { createTestDatabase } from './setup.js';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../src/server/middleware/csrf.js';

describe('Customer Purchase Flow & Order Management', () => {
  let app: any;
  let csrfToken: string;
  let csrfCookie: string;

  beforeEach(async () => {
    const db = createTestDatabase();
    app = createApp(db);

    // Obtain CSRF token
    const tokenRes = await request(app).get('/api/csrf-token');
    csrfToken = tokenRes.body.csrfToken;
    const cookieHeader = tokenRes.headers['set-cookie'];
    csrfCookie = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader as unknown as string);
  });

  it('creates a new pending order with ₹3,499 INR amount and UPI details', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        customerName: 'Aarav Sharma',
        customerEmail: 'aarav@example.com',
        domain: 'blog.aaravtech.in',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.order.orderRef).toMatch(/^DIG-ORD-/);
    expect(res.body.order.amountINR).toBe(3499);
    expect(res.body.order.currency).toBe('INR');
    expect(res.body.order.status).toBe('pending_payment');
    expect(res.body.order.domain).toBe('blog.aaravtech.in');

    // Genuine UPI details & QR Data URL
    expect(res.body.payment.upiId).toBe('varunchauhan1998@ybl');
    expect(res.body.payment.payeeName).toBe('API Section');
    expect(res.body.payment.upiUri).toContain('upi://pay');
    expect(res.body.payment.qrDataUrl).toContain('data:image/png;base64');
  });

  it('rejects order creation with invalid customer inputs', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        customerName: 'A', // too short
        customerEmail: 'not-an-email',
        domain: 'invalid domain with spaces',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toHaveProperty('customerName');
    expect(res.body.details).toHaveProperty('customerEmail');
    expect(res.body.details).toHaveProperty('domain');
  });

  it('submits payment verification with UTR and changes status to verification_submitted', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        customerName: 'Priya Patel',
        customerEmail: 'priya@acme.dev',
        domain: 'editor.acme.dev',
      });

    const orderRef = orderRes.body.order.orderRef;

    // 2. Submit payment UTR
    const payRes = await request(app)
      .post(`/api/orders/${orderRef}/payment`)
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .field('utrReference', 'UPI394820194821');

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.order.status).toBe('verification_submitted');
    expect(payRes.body.order.utrReference).toBe('UPI394820194821');

    // 3. Confirm order lookup reports verification_submitted and NO license active
    const lookupRes = await request(app).get(`/api/orders/${orderRef}`);
    expect(lookupRes.status).toBe(200);
    expect(lookupRes.body.status).toBe('verification_submitted');
    expect(lookupRes.body.license).toBeNull(); // NEVER activated automatically!
  });

  it('prevents duplicate payment submissions on pending review orders', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        customerName: 'Rohan Mehra',
        customerEmail: 'rohan@mehra.com',
        domain: 'mehra.com',
      });

    const orderRef = orderRes.body.order.orderRef;

    // First submission succeeds
    await request(app)
      .post(`/api/orders/${orderRef}/payment`)
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .field('utrReference', '982348291039');

    // Second submission should be rejected
    const dupRes = await request(app)
      .post(`/api/orders/${orderRef}/payment`)
      .set('Cookie', csrfCookie)
      .set(CSRF_HEADER_NAME, csrfToken)
      .field('utrReference', '982348291039');

    expect(dupRes.status).toBe(400);
    expect(dupRes.body.message).toContain('already pending manual review');
  });
});
