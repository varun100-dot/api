import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from '../src/server/db/schema.js';

export function createTestDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  return db;
}
