import { DatabaseSync } from 'node:sqlite';
import { generateLicenseKey } from '../utils/crypto.js';
import { recordAuditLog } from './audit.service.js';
import { getOrderById, OrderRecord } from './order.service.js';

export interface LicenseRecord {
  id: number;
  license_key: string;
  order_id: number;
  order_ref: string;
  customer_name: string;
  customer_email: string;
  domain: string;
  status: 'pending' | 'active' | 'expired' | 'suspended' | 'revoked';
  activated_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface LicenseRenewalRecord {
  id: number;
  license_id: number;
  order_ref: string | null;
  previous_expiry: string;
  new_expiry: string;
  renewed_by: number;
  renewal_notes: string | null;
  payment_reference: string | null;
  created_at: string;
}

/**
 * Calculate expiry date exactly 12 months after the given starting date
 */
export function calculateAnnualExpiry(startDate: Date = new Date()): Date {
  const expiry = new Date(startDate.getTime());
  expiry.setFullYear(expiry.getFullYear() + 1);
  return expiry;
}

/**
 * Approve payment and generate a production license
 */
export function approvePayment(
  db: DatabaseSync,
  orderId: number,
  adminId: number,
  ipAddress?: string
): { order: OrderRecord; license: LicenseRecord } {
  const order = getOrderById(db, orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status === 'payment_approved') {
    throw new Error('Order payment is already approved.');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const expiryIso = calculateAnnualExpiry(now).toISOString();

  // Begin transaction
  db.exec('BEGIN TRANSACTION');
  try {
    // 1. Update order status
    const updateOrderStmt = db.prepare(`
      UPDATE orders SET
        status = 'payment_approved',
        reviewed_by = ?,
        reviewed_at = ?,
        rejection_reason = NULL,
        updated_at = ?
      WHERE id = ?
    `);
    updateOrderStmt.run(adminId, nowIso, nowIso, order.id);

    // 2. Check if a license already exists for this order
    const existingLicStmt = db.prepare('SELECT * FROM licenses WHERE order_id = ?');
    let license = existingLicStmt.get(order.id) as unknown as LicenseRecord | null;

    if (!license) {
      const licenseKey = generateLicenseKey();
      const insertLicStmt = db.prepare(`
        INSERT INTO licenses (
          license_key, order_id, order_ref, customer_name, customer_email,
          domain, status, activated_at, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertLicStmt.run(
        licenseKey,
        order.id,
        order.order_ref,
        order.customer_name,
        order.customer_email,
        order.domain,
        'active',
        nowIso,
        expiryIso,
        nowIso,
        nowIso
      );

      const getLicStmt = db.prepare('SELECT * FROM licenses WHERE license_key = ?');
      license = getLicStmt.get(licenseKey) as unknown as LicenseRecord;
    } else {
      // Re-activate if was pending/suspended
      const reactivateStmt = db.prepare(`
        UPDATE licenses SET
          status = 'active',
          activated_at = ?,
          expires_at = ?,
          updated_at = ?
        WHERE id = ?
      `);
      reactivateStmt.run(nowIso, expiryIso, nowIso, license.id);
      const getLicStmt = db.prepare('SELECT * FROM licenses WHERE id = ?');
      license = getLicStmt.get(license.id) as unknown as LicenseRecord;
    }

    db.exec('COMMIT');

    const updatedOrder = getOrderById(db, order.id)!;

    recordAuditLog(db, {
      action: 'PAYMENT_APPROVED',
      actorType: 'ADMIN',
      actorId: String(adminId),
      targetType: 'ORDER',
      targetId: order.order_ref,
      details: { licenseKey: license!.license_key, domain: order.domain },
      ipAddress,
    });

    recordAuditLog(db, {
      action: 'LICENSE_GENERATED',
      actorType: 'ADMIN',
      actorId: String(adminId),
      targetType: 'LICENSE',
      targetId: license!.license_key,
      details: { domain: order.domain, expiresAt: expiryIso },
      ipAddress,
    });

    return { order: updatedOrder, license: license! };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Reject payment with a recorded reason
 */
export function rejectPayment(
  db: DatabaseSync,
  orderId: number,
  adminId: number,
  reason: string,
  ipAddress?: string
): OrderRecord {
  const order = getOrderById(db, orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status === 'payment_approved') {
    throw new Error('Cannot reject an already approved order.');
  }

  if (!reason || reason.trim().length < 3) {
    throw new Error('A descriptive rejection reason must be provided (min 3 characters).');
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE orders SET
      status = 'payment_rejected',
      reviewed_by = ?,
      reviewed_at = ?,
      rejection_reason = ?,
      updated_at = ?
    WHERE id = ?
  `);

  stmt.run(adminId, now, reason.trim(), now, order.id);

  const updatedOrder = getOrderById(db, order.id)!;

  recordAuditLog(db, {
    action: 'PAYMENT_REJECTED',
    actorType: 'ADMIN',
    actorId: String(adminId),
    targetType: 'ORDER',
    targetId: order.order_ref,
    details: { reason: reason.trim() },
    ipAddress,
  });

  return updatedOrder;
}

/**
 * Perform manual renewal of an existing active or expired license
 * Extends expiry exactly 12 months after verified payment
 */
export function renewLicense(
  db: DatabaseSync,
  licenseId: number,
  adminId: number,
  input: {
    paymentReference: string;
    notes?: string;
    ipAddress?: string;
  }
): { license: LicenseRecord; renewal: LicenseRenewalRecord } {
  if (!input.paymentReference || input.paymentReference.trim().length < 4) {
    throw new Error('Valid payment reference / UTR is required to record a manual renewal.');
  }

  const licStmt = db.prepare('SELECT * FROM licenses WHERE id = ?');
  const license = licStmt.get(licenseId) as unknown as LicenseRecord | null;
  if (!license) {
    throw new Error('License not found');
  }

  const now = new Date();
  const currentExpiry = new Date(license.expires_at);

  // If current expiry is in the future, extend 12 months from current expiry.
  // If already in the past (expired), extend 12 months from right now.
  const baseDate = currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
  const newExpiry = calculateAnnualExpiry(baseDate);

  const nowIso = now.toISOString();
  const newExpiryIso = newExpiry.toISOString();

  db.exec('BEGIN TRANSACTION');
  try {
    const updateLicStmt = db.prepare(`
      UPDATE licenses SET
        status = 'active',
        expires_at = ?,
        updated_at = ?
      WHERE id = ?
    `);
    updateLicStmt.run(newExpiryIso, nowIso, license.id);

    const insertRenewalStmt = db.prepare(`
      INSERT INTO license_renewals (
        license_id, order_ref, previous_expiry, new_expiry, renewed_by,
        renewal_notes, payment_reference, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const renewalRes = insertRenewalStmt.run(
      license.id,
      license.order_ref,
      license.expires_at,
      newExpiryIso,
      adminId,
      input.notes?.trim() || null,
      input.paymentReference.trim(),
      nowIso
    );

    db.exec('COMMIT');

    const updatedLicense = licStmt.get(license.id) as unknown as LicenseRecord;
    const getRenewalStmt = db.prepare('SELECT * FROM license_renewals WHERE id = ?');
    const renewal = getRenewalStmt.get(renewalRes.lastInsertRowid) as unknown as LicenseRenewalRecord;

    recordAuditLog(db, {
      action: 'LICENSE_RENEWED',
      actorType: 'ADMIN',
      actorId: String(adminId),
      targetType: 'LICENSE',
      targetId: license.license_key,
      details: {
        paymentRef: input.paymentReference.trim(),
        previousExpiry: license.expires_at,
        newExpiry: newExpiryIso,
      },
      ipAddress: input.ipAddress,
    });

    return { license: updatedLicense, renewal };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Get license details by order reference
 */
export function getLicenseByOrderRef(db: DatabaseSync, orderRef: string): LicenseRecord | null {
  const stmt = db.prepare('SELECT * FROM licenses WHERE order_ref = ?');
  const row = stmt.get(orderRef);
  return (row as unknown as LicenseRecord) || null;
}

/**
 * Get license details by license key
 */
export function getLicenseByKey(db: DatabaseSync, key: string): LicenseRecord | null {
  const stmt = db.prepare('SELECT * FROM licenses WHERE license_key = ?');
  const row = stmt.get(key.trim());
  return (row as unknown as LicenseRecord) || null;
}

/**
 * List all licenses with renewal histories
 */
export function listLicenses(
  db: DatabaseSync,
  options: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}
): { licenses: (LicenseRecord & { renewals: LicenseRenewalRecord[] })[]; total: number } {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (options.status && options.status !== 'all') {
    whereClauses.push('status = ?');
    params.push(options.status);
  }

  if (options.search) {
    whereClauses.push('(license_key LIKE ? OR customer_email LIKE ? OR customer_name LIKE ? OR domain LIKE ? OR order_ref LIKE ?)');
    const searchTerm = `%${options.search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM licenses ${whereSql}`);
  const countRow = countStmt.get(...params) as unknown as { total: number };
  const total = countRow ? countRow.total : 0;

  const queryStmt = db.prepare(`
    SELECT * FROM licenses 
    ${whereSql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `);

  const licenses = queryStmt.all(...params, limit, offset) as unknown as LicenseRecord[];

  // Fetch renewals for each license
  const renewalsStmt = db.prepare(`
    SELECT * FROM license_renewals WHERE license_id = ? ORDER BY id DESC
  `);

  const licensesWithRenewals = licenses.map((lic) => {
    // Check if expired and update status dynamically
    const now = new Date();
    const expiry = new Date(lic.expires_at);
    if (lic.status === 'active' && expiry.getTime() < now.getTime()) {
      lic.status = 'expired';
      db.prepare("UPDATE licenses SET status = 'expired', updated_at = ? WHERE id = ?").run(
        now.toISOString(),
        lic.id
      );
    }

    const renewals = renewalsStmt.all(lic.id) as unknown as LicenseRenewalRecord[];
    return { ...lic, renewals };
  });

  return { licenses: licensesWithRenewals, total };
}

/**
 * Domain Verification API (Sales Portal Registry check)
 */
export function verifyDomainLicense(
  db: DatabaseSync,
  domain: string,
  licenseKey: string
): {
  valid: boolean;
  status: string;
  domain: string;
  license_key: string;
  expires_at?: string;
  message: string;
} {
  const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
  const license = getLicenseByKey(db, licenseKey);

  if (!license) {
    return {
      valid: false,
      status: 'not_found',
      domain: cleanDomain,
      license_key: licenseKey,
      message: 'License key not found in the API Section registry.',
    };
  }

  if (license.domain !== cleanDomain) {
    return {
      valid: false,
      status: 'domain_mismatch',
      domain: cleanDomain,
      license_key: license.license_key,
      message: `License is authorized specifically for domain '${license.domain}', not '${cleanDomain}'.`,
    };
  }

  const now = new Date();
  const expiry = new Date(license.expires_at);

  if (expiry.getTime() < now.getTime()) {
    if (license.status === 'active') {
      db.prepare("UPDATE licenses SET status = 'expired', updated_at = ? WHERE id = ?").run(
        now.toISOString(),
        license.id
      );
      license.status = 'expired';
    }
    return {
      valid: false,
      status: 'expired',
      domain: cleanDomain,
      license_key: license.license_key,
      expires_at: license.expires_at,
      message: 'License expired. Please perform manual annual renewal to restore active status.',
    };
  }

  if (license.status !== 'active') {
    return {
      valid: false,
      status: license.status,
      domain: cleanDomain,
      license_key: license.license_key,
      expires_at: license.expires_at,
      message: `License is currently ${license.status}.`,
    };
  }

  return {
    valid: true,
    status: 'active',
    domain: cleanDomain,
    license_key: license.license_key,
    expires_at: license.expires_at,
    message: 'Valid active license for authorized domain.',
  };
}
