import { DatabaseSync } from 'node:sqlite';

export interface AuditLogEntry {
  action: string;
  actorType: 'SYSTEM' | 'CUSTOMER' | 'ADMIN';
  actorId?: string | null;
  targetType?: 'ORDER' | 'LICENSE' | 'AUTH' | null;
  targetId?: string | null;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
}

export function recordAuditLog(db: DatabaseSync, entry: AuditLogEntry): void {
  try {
    const detailsStr = typeof entry.details === 'object' && entry.details !== null
      ? JSON.stringify(entry.details)
      : (entry.details || null);

    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        action, actor_type, actor_id, target_type, target_id, details, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.action,
      entry.actorType,
      entry.actorId || null,
      entry.targetType || null,
      entry.targetId || null,
      detailsStr,
      entry.ipAddress || null,
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export function getAuditLogs(db: DatabaseSync, limit = 100): unknown[] {
  const stmt = db.prepare(`
    SELECT * FROM audit_logs
    ORDER BY id DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}
