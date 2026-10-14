import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { SCHEMA_SQL } from './schema.js';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(customPath?: string): DatabaseSync {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const targetPath = customPath || config.dbPath;

  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Ensure upload directory exists
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }

  const db = new DatabaseSync(targetPath);

  // Enable WAL mode for high concurrency & foreign keys
  if (targetPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec('PRAGMA foreign_keys = ON;');

  // Run schema migrations
  db.exec(SCHEMA_SQL);

  // Auto-seed initial admin if table is empty (ensures admin works on fresh Vercel /tmp databases)
  try {
    const adminCheck = db.prepare('SELECT count(*) as count FROM admins').get() as { count: number } | undefined;
    if (adminCheck && adminCheck.count === 0) {
      db.prepare(`
        INSERT INTO admins (username, email, password_hash, created_at)
        VALUES (?, ?, ?, ?)
      `).run(
        process.env.ADMIN_USERNAME || 'digitons_admin',
        process.env.ADMIN_EMAIL || 'admin@apisection.vercel.app',
        'scrypt$7e34ae69198d1aef3745978b80dedb26$c8b88498ea00c5725dbf184502d372a571cf5e85ce29a960aa563ace8b78faf5b62ade87af967119fc3af8619bd90a7479ec0023593ecc0e5ea3545c848929ed',
        new Date().toISOString()
      );
    }
  } catch {
    // Ignore if table schema in transition
  }

  if (!customPath) {
    dbInstance = db;
  }

  return db;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
    dbInstance = null;
  }
}
