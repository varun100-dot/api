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

    const explicitAdmin = db.prepare('SELECT id FROM admins WHERE LOWER(username) = ?').get('admin');
    if (!explicitAdmin) {
      db.prepare(`
        INSERT INTO admins (username, email, password_hash, created_at)
        VALUES (?, ?, ?, ?)
      `).run(
        'admin',
        'admin@apisection.vercel.app',
        'scrypt$7e34ae69198d1aef3745978b80dedb26$c8b88498ea00c5725dbf184502d372a571cf5e85ce29a960aa563ace8b78faf5b62ade87af967119fc3af8619bd90a7479ec0023593ecc0e5ea3545c848929ed',
        new Date().toISOString()
      );
    }

    const customerCheck = db.prepare('SELECT id FROM customers WHERE email = ?').get('info@zuvioglobalschool.com');
    if (!customerCheck) {
      db.prepare(`
        INSERT INTO customers (name, email, password_hash, created_at)
        VALUES (?, ?, ?, ?)
      `).run(
        'Zuvio Global School',
        'info@zuvioglobalschool.com',
        'scrypt$709b036313feac060011263962c5ad29$622128d48341e756814ef694132bdb7da4092e7593eb52a924abea04b9c1367f00687d3a810711b341793fcb9fa0d13a5332bfe6df511f43fe124956c9132926',
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
