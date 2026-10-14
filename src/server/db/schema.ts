export const SCHEMA_SQL = `
-- Digitons Development API Sales Platform Database Schema

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_sessions (
  id TEXT PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_ref TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  domain TEXT NOT NULL,
  amount_inr INTEGER NOT NULL DEFAULT 3499,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending_payment', -- pending_payment, verification_submitted, payment_approved, payment_rejected, cancelled
  upi_id TEXT NOT NULL,
  payee_name TEXT NOT NULL,
  utr_reference TEXT,
  proof_filename TEXT,
  proof_original_name TEXT,
  proof_mime_type TEXT,
  proof_size INTEGER,
  submitted_at TEXT,
  reviewed_by INTEGER,
  reviewed_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (reviewed_by) REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key TEXT UNIQUE NOT NULL,
  order_id INTEGER NOT NULL,
  order_ref TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, suspended, revoked
  activated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS license_renewals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_id INTEGER NOT NULL,
  order_ref TEXT,
  previous_expiry TEXT NOT NULL,
  new_expiry TEXT NOT NULL,
  renewed_by INTEGER NOT NULL,
  renewal_notes TEXT,
  payment_reference TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (license_id) REFERENCES licenses(id),
  FOREIGN KEY (renewed_by) REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  actor_type TEXT NOT NULL, -- SYSTEM, CUSTOMER, ADMIN
  actor_id TEXT,
  target_type TEXT, -- ORDER, LICENSE, AUTH
  target_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);

-- Indexes for performant lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_ref ON orders(order_ref);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_domain ON orders(domain);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_domain ON licenses(domain);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
`;
