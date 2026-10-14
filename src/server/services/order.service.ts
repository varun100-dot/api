import { DatabaseSync } from 'node:sqlite';
import { generateOrderReference } from '../utils/crypto.js';
import { config } from '../config.js';
import { recordAuditLog } from './audit.service.js';

export interface OrderRecord {
  id: number;
  order_ref: string;
  customer_name: string;
  customer_email: string;
  domain: string;
  amount_inr: number;
  currency: string;
  status: 'pending_payment' | 'verification_submitted' | 'payment_approved' | 'payment_rejected' | 'cancelled';
  upi_id: string;
  payee_name: string;
  utr_reference: string | null;
  proof_filename: string | null;
  proof_original_name: string | null;
  proof_mime_type: string | null;
  proof_size: number | null;
  submitted_at: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  domain: string;
  ipAddress?: string;
}

export interface SubmitPaymentInput {
  orderRef: string;
  utrReference: string;
  file?: {
    filename: string;
    originalname: string;
    mimetype: string;
    size: number;
  };
  ipAddress?: string;
}

/**
 * Clean and normalize domain name (strip protocol, paths, ports, lowercase)
 */
export function sanitizeDomain(rawDomain: string): string {
  let cleaned = rawDomain.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/\/.*$/, '');
  cleaned = cleaned.replace(/:\d+$/, '');
  return cleaned;
}

/**
 * Create a new pending order
 */
export function createOrder(db: DatabaseSync, input: CreateOrderInput): OrderRecord {
  const normalizedDomain = sanitizeDomain(input.domain);
  const now = new Date().toISOString();
  const orderRef = generateOrderReference();

  const stmt = db.prepare(`
    INSERT INTO orders (
      order_ref, customer_name, customer_email, domain, amount_inr, currency,
      status, upi_id, payee_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    orderRef,
    input.customerName.trim(),
    input.customerEmail.trim().toLowerCase(),
    normalizedDomain,
    config.commercial.priceINR,
    config.commercial.currency,
    'pending_payment',
    config.commercial.upiId,
    config.commercial.upiPayeeName,
    now,
    now
  );

  const order = getOrderByRef(db, orderRef);
  if (!order) {
    throw new Error('Failed to retrieve created order');
  }

  recordAuditLog(db, {
    action: 'ORDER_CREATED',
    actorType: 'CUSTOMER',
    actorId: input.customerEmail,
    targetType: 'ORDER',
    targetId: orderRef,
    details: { domain: normalizedDomain, amount: config.commercial.priceINR },
    ipAddress: input.ipAddress,
  });

  return order;
}

export function getOrderByRef(db: DatabaseSync, orderRef: string): OrderRecord | null {
  const stmt = db.prepare('SELECT * FROM orders WHERE order_ref = ?');
  const row = stmt.get(orderRef);
  return (row as unknown as OrderRecord) || null;
}

export function getOrderById(db: DatabaseSync, id: number): OrderRecord | null {
  const stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
  const row = stmt.get(id);
  return (row as unknown as OrderRecord) || null;
}

/**
 * Customer submits payment reference / UTR for an existing order
 */
export function submitPaymentVerification(db: DatabaseSync, input: SubmitPaymentInput): OrderRecord {
  const order = getOrderByRef(db, input.orderRef);
  if (!order) {
    throw new Error('Order not found');
  }

  // Prevent duplicate submissions if already approved or currently undergoing verification
  if (order.status === 'payment_approved') {
    throw new Error('This order has already been verified and approved.');
  }
  if (order.status === 'verification_submitted') {
    throw new Error('Payment verification is already pending manual review for this order.');
  }

  // Check if UTR is already in use by another order
  const utrCheck = db.prepare(`
    SELECT id, order_ref, status FROM orders 
    WHERE utr_reference = ? AND order_ref != ? AND status IN ('verification_submitted', 'payment_approved')
  `);
  const existingWithUtr = utrCheck.get(input.utrReference.trim(), input.orderRef);
  if (existingWithUtr) {
    throw new Error('This UTR / transaction reference number has already been submitted for another order.');
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE orders SET
      status = 'verification_submitted',
      utr_reference = ?,
      proof_filename = COALESCE(?, proof_filename),
      proof_original_name = COALESCE(?, proof_original_name),
      proof_mime_type = COALESCE(?, proof_mime_type),
      proof_size = COALESCE(?, proof_size),
      submitted_at = ?,
      updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    input.utrReference.trim(),
    input.file?.filename || null,
    input.file?.originalname || null,
    input.file?.mimetype || null,
    input.file?.size || null,
    now,
    now,
    order.id
  );

  const updatedOrder = getOrderById(db, order.id)!;

  recordAuditLog(db, {
    action: 'PAYMENT_SUBMITTED',
    actorType: 'CUSTOMER',
    actorId: updatedOrder.customer_email,
    targetType: 'ORDER',
    targetId: updatedOrder.order_ref,
    details: { utr: input.utrReference.trim(), hasFile: Boolean(input.file) },
    ipAddress: input.ipAddress,
  });

  return updatedOrder;
}

/**
 * List orders with optional status, search filter, and pagination
 */
export function listOrders(
  db: DatabaseSync,
  options: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}
): { orders: OrderRecord[]; total: number } {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (options.status && options.status !== 'all') {
    whereClauses.push('status = ?');
    params.push(options.status);
  }

  if (options.search) {
    whereClauses.push('(order_ref LIKE ? OR customer_email LIKE ? OR customer_name LIKE ? OR domain LIKE ? OR utr_reference LIKE ?)');
    const searchTerm = `%${options.search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM orders ${whereSql}`);
  const countRow = countStmt.get(...params) as unknown as { total: number };
  const total = countRow ? countRow.total : 0;

  const queryStmt = db.prepare(`
    SELECT * FROM orders 
    ${whereSql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `);

  const orders = queryStmt.all(...params, limit, offset) as unknown as OrderRecord[];

  return { orders, total };
}
