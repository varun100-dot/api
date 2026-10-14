import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { customerRegisterSchema, customerLoginSchema } from '../utils/validation.js';
import {
  createCustomerSession,
  destroyCustomerSession,
  CUSTOMER_SESSION_COOKIE,
  requireCustomerAuth,
} from '../middleware/customer-auth.js';
import { authRateLimiter } from '../middleware/rate-limiter.js';
import { recordAuditLog } from '../services/audit.service.js';
import { LicenseRecord } from '../services/license.service.js';
import { OrderRecord } from '../services/order.service.js';
import { sendInvoiceEmail } from '../services/email.service.js';

export const customerRouter = Router();

/**
 * Register a new customer account
 */
customerRouter.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = customerRegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { name, email, password } = parseResult.data;
    const db: DatabaseSync = req.db!;
    const cleanEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({
        error: 'Account exists',
        message: 'An account with this email address already exists. Please sign in.',
      });
    }

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO customers (name, email, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `);
    const insertRes = insertStmt.run(name.trim(), cleanEmail, passwordHash, now);
    const customerId = Number(insertRes.lastInsertRowid);

    // Create session
    const { sessionId, expiresAt } = createCustomerSession(db, customerId);

    res.cookie(CUSTOMER_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    recordAuditLog(db, {
      action: 'CUSTOMER_REGISTER',
      actorType: 'CUSTOMER',
      actorId: cleanEmail,
      targetType: 'AUTH',
      targetId: String(customerId),
      details: { name, email: cleanEmail },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    res.status(201).json({
      success: true,
      customer: {
        id: customerId,
        name: name.trim(),
        email: cleanEmail,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(500).json({ error: 'Registration failure', message });
  }
});

/**
 * Customer Login
 */
customerRouter.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = customerLoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parseResult.data;
    const db: DatabaseSync = req.db!;
    const cleanEmail = email.toLowerCase().trim();

    const stmt = db.prepare('SELECT * FROM customers WHERE email = ?');
    const customer = stmt.get(cleanEmail) as {
      id: number;
      name: string;
      email: string;
      password_hash: string;
    } | undefined;

    if (!customer) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Incorrect email or password.',
      });
    }

    const matches = await verifyPassword(password, customer.password_hash);
    if (!matches) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Incorrect email or password.',
      });
    }

    const { sessionId, expiresAt } = createCustomerSession(db, customer.id);

    res.cookie(CUSTOMER_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    res.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(500).json({ error: 'Login failure', message });
  }
});

/**
 * Customer Logout
 */
customerRouter.post('/logout', (req: Request, res: Response) => {
  const sessionId = req.cookies?.[CUSTOMER_SESSION_COOKIE];
  const db: DatabaseSync = req.db!;

  if (sessionId) {
    destroyCustomerSession(db, sessionId);
  }
  res.clearCookie(CUSTOMER_SESSION_COOKIE, { path: '/' });
  res.json({ success: true, message: 'Signed out successfully' });
});

/**
 * Customer Profile, Subscriptions, Days Left Countdown & Invoices/Bills
 */
customerRouter.get('/me', requireCustomerAuth, (req: Request, res: Response) => {
  try {
    const customer = req.customer!;
    const db: DatabaseSync = req.db!;

    // Fetch all orders matching customer email
    const ordersStmt = db.prepare('SELECT * FROM orders WHERE customer_email = ? ORDER BY id DESC');
    const orders = ordersStmt.all(customer.email.toLowerCase()) as unknown as OrderRecord[];

    // Fetch all licenses matching customer email
    const licensesStmt = db.prepare('SELECT * FROM licenses WHERE customer_email = ? ORDER BY id DESC');
    const licenses = licensesStmt.all(customer.email.toLowerCase()) as unknown as LicenseRecord[];

    const now = Date.now();

    // Map licenses with days left calculation
    const licensesWithDaysLeft = licenses.map((lic) => {
      const expiryMs = new Date(lic.expires_at).getTime();
      const diffMs = expiryMs - now;
      const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const isExpired = diffMs <= 0 || lic.status === 'expired';

      return {
        ...lic,
        daysLeft,
        isExpired,
        displayStatus: isExpired ? 'Expired' : lic.status.charAt(0).toUpperCase() + lic.status.slice(1),
      };
    });

    // Prepare formal bills/invoices for each order with 18% GST breakdown
    const invoices = orders.map((ord) => {
      const baseAmount = Number((ord.amount_inr / 1.18).toFixed(2)); // ₹2,965.25
      const taxAmount = Number((ord.amount_inr - baseAmount).toFixed(2)); // ₹533.75
      const cgst = Number((taxAmount / 2).toFixed(2)); // ₹266.88
      const sgst = Number((taxAmount - cgst).toFixed(2)); // ₹266.87

      return {
        invoiceNumber: `INV-${ord.order_ref}`,
        orderRef: ord.order_ref,
        date: ord.reviewed_at || ord.created_at,
        sacCode: '997331',
        seller: {
          brand: config.commercial.brandName,
          upiId: config.commercial.upiId,
          payeeName: config.commercial.upiPayeeName,
          websiteUrl: config.commercial.websiteUrl,
        },
        customer: {
          name: ord.customer_name,
          email: ord.customer_email,
          domain: ord.domain,
        },
        item: {
          description: `API Section Rich Text Editor — 1 Year Commercial License (${ord.domain})`,
          period: '12 Months (Annual)',
          sacCode: '997331',
          baseAmountINR: baseAmount,
          taxRate: '18% GST',
          taxAmountINR: taxAmount,
          totalAmountINR: ord.amount_inr,
          currency: ord.currency,
        },
        subtotalINR: baseAmount,
        taxRate: '18% GST',
        taxAmountINR: taxAmount,
        cgstINR: cgst,
        sgstINR: sgst,
        totalAmountINR: ord.amount_inr,
        currency: ord.currency,
        paymentStatus:
          ord.status === 'payment_approved'
            ? 'Verified & Paid'
            : ord.status === 'verification_submitted'
            ? 'Pending Verification'
            : ord.status === 'payment_rejected'
            ? 'Rejected'
            : 'Payment Pending',
        utrReference: ord.utr_reference,
        status: ord.status,
      };
    });

    res.json({
      authenticated: true,
      customer,
      orders,
      licenses: licensesWithDaysLeft,
      invoices,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch customer profile';
    res.status(500).json({ error: 'Profile fetch failed', message });
  }
});

/**
 * Send official invoice directly to the customer's email address
 */
customerRouter.post('/invoices/:orderRef/email', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const customer = req.customer!;
    const orderRef = req.params.orderRef;
    const db: DatabaseSync = req.db!;

    const orderStmt = db.prepare('SELECT * FROM orders WHERE order_ref = ? AND customer_email = ?');
    const order = orderStmt.get(orderRef, customer.email.toLowerCase()) as OrderRecord | undefined;

    if (!order) {
      return res.status(404).json({ error: 'Order not found', message: 'No matching order found for this invoice.' });
    }

    // Find associated license key if approved
    const licStmt = db.prepare('SELECT license_key FROM licenses WHERE domain = ? AND customer_email = ? AND status = ? LIMIT 1');
    const lic = licStmt.get(order.domain, customer.email.toLowerCase(), 'active') as { license_key: string } | undefined;

    const baseAmount = Number((order.amount_inr / 1.18).toFixed(2));
    const taxAmount = Number((order.amount_inr - baseAmount).toFixed(2));
    const cgst = Number((taxAmount / 2).toFixed(2));
    const sgst = Number((taxAmount - cgst).toFixed(2));

    const emailResult = await sendInvoiceEmail({
      customerName: customer.name,
      customerEmail: customer.email,
      invoiceNumber: `INV-${order.order_ref}`,
      orderRef: order.order_ref,
      domain: order.domain,
      date: order.reviewed_at || order.created_at,
      subtotalINR: baseAmount,
      taxAmountINR: taxAmount,
      cgstINR: cgst,
      sgstINR: sgst,
      totalAmountINR: order.amount_inr,
      licenseKey: lic?.license_key,
      paymentStatus:
        order.status === 'payment_approved'
          ? 'Verified & Paid'
          : order.status === 'verification_submitted'
          ? 'Pending Verification'
          : order.status === 'payment_rejected'
          ? 'Rejected'
          : 'Payment Pending',
      utrReference: order.utr_reference,
    });

    res.json({
      success: true,
      message: `Tax invoice has been dispatched to ${customer.email}.`,
      simulated: emailResult.simulated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send invoice email';
    res.status(500).json({ error: 'Email dispatch failed', message });
  }
});

