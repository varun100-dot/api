import { Request, Response, NextFunction } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { generateSecureToken } from '../utils/crypto.js';
import { config } from '../config.js';

export const ADMIN_SESSION_COOKIE = 'digitons_admin_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface AuthenticatedAdmin {
  id: number;
  username: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
      db?: DatabaseSync;
    }
  }
}

export function createAdminSession(db: DatabaseSync, adminId: number): { sessionId: string; expiresAt: Date } {
  const sessionId = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO admin_sessions (id, admin_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(sessionId, adminId, expiresAt.toISOString(), now);

  return { sessionId, expiresAt };
}

export function destroyAdminSession(db: DatabaseSync, sessionId: string): void {
  const stmt = db.prepare('DELETE FROM admin_sessions WHERE id = ?');
  stmt.run(sessionId);
}

export function cleanupExpiredSessions(db: DatabaseSync): void {
  const stmt = db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?');
  stmt.run(new Date().toISOString());
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const sessionId = req.cookies?.[ADMIN_SESSION_COOKIE];
  if (!sessionId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin authentication required. Please sign in.',
    });
    return;
  }

  const db: DatabaseSync = req.db!;
  const stmt = db.prepare(`
    SELECT s.id as session_id, s.expires_at, a.id as admin_id, a.username, a.email
    FROM admin_sessions s
    JOIN admins a ON s.admin_id = a.id
    WHERE s.id = ?
  `);

  const row = stmt.get(sessionId) as {
    session_id: string;
    expires_at: string;
    admin_id: number;
    username: string;
    email: string;
  } | undefined;

  if (!row) {
    res.clearCookie(ADMIN_SESSION_COOKIE);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or terminated admin session.',
    });
    return;
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroyAdminSession(db, sessionId);
    res.clearCookie(ADMIN_SESSION_COOKIE);
    res.status(401).json({
      error: 'Session expired',
      message: 'Your admin session has expired. Please sign in again.',
    });
    return;
  }

  req.admin = {
    id: row.admin_id,
    username: row.username,
    email: row.email,
  };

  next();
}
