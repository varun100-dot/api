import { Router, Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import {
  requireAdminAuth,
  createAdminSession,
  destroyAdminSession,
  ADMIN_SESSION_COOKIE,
} from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rate-limiter.js';
import { verifyPassword } from '../utils/crypto.js';
import {
  adminLoginSchema,
  rejectPaymentSchema,
  renewLicenseSchema,
} from '../utils/validation.js';
import { listOrders, getOrderById } from '../services/order.service.js';
import {
  approvePayment,
  rejectPayment,
  renewLicense,
  listLicenses,
} from '../services/license.service.js';
import { recordAuditLog, getAuditLogs } from '../services/audit.service.js';

export const adminRouter = Router();

/**
 * Admin Login
 */
adminRouter.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = adminLoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { username, password } = parseResult.data;
    const db: DatabaseSync = req.db!;

    const stmt = db.prepare('SELECT * FROM admins WHERE username = ? OR email = ?');
    const admin = stmt.get(username, username) as {
      id: number;
      username: string;
      email: string;
      password_hash: string;
    } | undefined;

    if (!admin) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password incorrect.',
      });
    }

    const passwordMatches = await verifyPassword(password, admin.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password incorrect.',
      });
    }

    const { sessionId, expiresAt } = createAdminSession(db, admin.id);

    // Update last login
    db.prepare('UPDATE admins SET last_login_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      admin.id
    );

    res.cookie(ADMIN_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    recordAuditLog(db, {
      action: 'ADMIN_LOGIN',
      actorType: 'ADMIN',
      actorId: admin.username,
      targetType: 'AUTH',
      targetId: String(admin.id),
      details: { username: admin.username },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(500).json({ error: 'Login failure', message });
  }
});

/**
 * Admin Logout
 */
adminRouter.post('/logout', (req: Request, res: Response) => {
  const sessionId = req.cookies?.[ADMIN_SESSION_COOKIE];
  const db: DatabaseSync = req.db!;

  if (sessionId) {
    destroyAdminSession(db, sessionId);
  }
  res.clearCookie(ADMIN_SESSION_COOKIE, { path: '/' });
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * Check current admin auth state
 */
adminRouter.get('/me', requireAdminAuth, (req: Request, res: Response) => {
  res.json({
    authenticated: true,
    admin: req.admin,
  });
});

/**
 * List orders with search, filter, pagination
 */
adminRouter.get('/orders', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const db: DatabaseSync = req.db!;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const result = listOrders(db, { status, search, limit, offset });
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list orders';
    res.status(500).json({ error: 'Order fetch failed', message });
  }
});

/**
 * Get single order details
 */
adminRouter.get('/orders/:id', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db: DatabaseSync = req.db!;
    const order = getOrderById(db, id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get order';
    res.status(500).json({ error: 'Order fetch failed', message });
  }
});

/**
 * Approve order payment & activate license
 */
adminRouter.post('/orders/:id/approve', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db: DatabaseSync = req.db!;
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = approvePayment(db, id, req.admin!.id, ipAddress);

    res.json({
      success: true,
      message: 'Payment approved and license generated successfully.',
      order: result.order,
      license: result.license,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Approval failed';
    res.status(400).json({ error: 'Approval rejected', message });
  }
});

/**
 * Reject order payment with reason
 */
adminRouter.post('/orders/:id/reject', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parseResult = rejectPaymentSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const db: DatabaseSync = req.db!;
    const ipAddress = req.ip || req.socket.remoteAddress;

    const order = rejectPayment(db, id, req.admin!.id, parseResult.data.reason, ipAddress);

    res.json({
      success: true,
      message: 'Payment rejected with recorded reason.',
      order,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Rejection failed';
    res.status(400).json({ error: 'Action failed', message });
  }
});

/**
 * List licenses with renewal history
 */
adminRouter.get('/licenses', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const db: DatabaseSync = req.db!;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const result = listLicenses(db, { status, search, limit, offset });
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list licenses';
    res.status(500).json({ error: 'License fetch failed', message });
  }
});

/**
 * Manual license renewal
 */
adminRouter.post('/licenses/:id/renew', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parseResult = renewLicenseSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const db: DatabaseSync = req.db!;
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = renewLicense(db, id, req.admin!.id, {
      paymentReference: parseResult.data.paymentReference,
      notes: parseResult.data.notes,
      ipAddress,
    });

    res.json({
      success: true,
      message: 'License renewed for 12 months after verified payment.',
      license: result.license,
      renewal: result.renewal,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Renewal failed';
    res.status(400).json({ error: 'Renewal rejected', message });
  }
});

/**
 * View audit logs
 */
adminRouter.get('/audit-logs', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const db: DatabaseSync = req.db!;
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const logs = getAuditLogs(db, limit);
    res.json({ logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve audit logs';
    res.status(500).json({ error: 'Audit fetch failed', message });
  }
});

/**
 * Securely serve uploaded payment proof files to authenticated admins
 */
adminRouter.get('/proofs/:filename', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    // Strict regex check to prevent directory traversal
    if (!/^[a-f0-9]{32}\.(png|jpe?g|webp|pdf)$/i.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.resolve(config.uploadDir, filename);

    // Verify resolved path is strictly within uploadDir
    if (!filePath.startsWith(config.uploadDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Proof file not found' });
    }

    res.sendFile(filePath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to serve proof';
    res.status(500).json({ error: 'Download failed', message });
  }
});
