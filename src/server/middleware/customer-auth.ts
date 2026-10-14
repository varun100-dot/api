import { Request, Response, NextFunction } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { generateSecureToken } from '../utils/crypto.js';

export const CUSTOMER_SESSION_COOKIE = 'digitons_customer_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AuthenticatedCustomer {
  id: number;
  name: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      customer?: AuthenticatedCustomer;
    }
  }
}

export function createCustomerSession(db: DatabaseSync, customerId: number): { sessionId: string; expiresAt: Date } {
  const sessionId = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO customer_sessions (id, customer_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(sessionId, customerId, expiresAt.toISOString(), now);

  return { sessionId, expiresAt };
}

export function destroyCustomerSession(db: DatabaseSync, sessionId: string): void {
  const stmt = db.prepare('DELETE FROM customer_sessions WHERE id = ?');
  stmt.run(sessionId);
}

export function getCustomerFromSession(db: DatabaseSync, sessionId: string): AuthenticatedCustomer | null {
  if (!sessionId) return null;

  const stmt = db.prepare(`
    SELECT s.id as session_id, s.expires_at, c.id, c.name, c.email
    FROM customer_sessions s
    JOIN customers c ON s.customer_id = c.id
    WHERE s.id = ?
  `);

  const row = stmt.get(sessionId) as {
    session_id: string;
    expires_at: string;
    id: number;
    name: string;
    email: string;
  } | undefined;

  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroyCustomerSession(db, sessionId);
    return null;
  }

  return { id: row.id, name: row.name, email: row.email };
}

export function requireCustomerAuth(req: Request, res: Response, next: NextFunction): void {
  const sessionId = req.cookies?.[CUSTOMER_SESSION_COOKIE];
  const db: DatabaseSync = req.db!;

  const customer = getCustomerFromSession(db, sessionId);
  if (!customer) {
    if (sessionId) res.clearCookie(CUSTOMER_SESSION_COOKIE);
    res.status(401).json({ error: 'Unauthorized', message: 'Customer login required' });
    return;
  }

  req.customer = customer;
  next();
}

export function optionalCustomerAuth(req: Request, _res: Response, next: NextFunction): void {
  const sessionId = req.cookies?.[CUSTOMER_SESSION_COOKIE];
  if (sessionId && req.db) {
    const customer = getCustomerFromSession(req.db, sessionId);
    if (customer) {
      req.customer = customer;
    }
  }
  next();
}
