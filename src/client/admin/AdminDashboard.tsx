import React, { useState, useEffect } from 'react';
import {
  FileText,
  Key,
  ShieldAlert,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertTriangle,
  Eye,
  Check,
  Calendar,
} from 'lucide-react';

interface AdminDashboardProps {
  csrfToken: string;
  admin: { id: number; username: string; email: string };
  onLogout: () => void;
  onBackToStore: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  csrfToken,
  admin,
  onLogout,
  onBackToStore,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'licenses' | 'audit'>('orders');

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Selected Order for Review Modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Licenses State
  const [licenses, setLicenses] = useState<any[]>([]);
  const [licensesTotal, setLicensesTotal] = useState(0);
  const [licenseSearch, setLicenseSearch] = useState('');
  const [loadingLicenses, setLoadingLicenses] = useState(false);

  // Selected License for Renewal Modal
  const [selectedLicense, setSelectedLicense] = useState<any | null>(null);
  const [renewalPaymentRef, setRenewalPaymentRef] = useState('');
  const [renewalNotes, setRenewalNotes] = useState('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Fetch Orders
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams();
      if (orderFilter !== 'all') params.set('status', orderFilter);
      if (orderSearch) params.set('search', orderSearch);
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
        setOrdersTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch Licenses
  const fetchLicenses = async () => {
    setLoadingLicenses(true);
    try {
      const params = new URLSearchParams();
      if (licenseSearch) params.set('search', licenseSearch);
      const res = await fetch(`/api/admin/licenses?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLicenses(data.licenses || []);
        setLicensesTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load licenses', err);
    } finally {
      setLoadingLicenses(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'licenses') fetchLicenses();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, orderFilter]);

  // Order Approval
  const handleApprove = async (orderId: number) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xsrf-token': csrfToken,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');

      setActionMessage('Payment successfully approved. License created and activated for 12 months.');
      setSelectedOrder(null);
      fetchOrders();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Order Rejection
  const handleReject = async (orderId: number) => {
    if (!rejectionReason.trim()) {
      setActionError('A descriptive rejection reason is required.');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xsrf-token': csrfToken,
        },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Rejection failed');

      setActionMessage('Payment rejected with recorded reason.');
      setSelectedOrder(null);
      setRejectionReason('');
      fetchOrders();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  // License Renewal
  const handleRenewLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicense) return;
    if (!renewalPaymentRef.trim()) {
      setActionError('Payment reference is required.');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/licenses/${selectedLicense.id}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xsrf-token': csrfToken,
        },
        body: JSON.stringify({
          paymentReference: renewalPaymentRef.trim(),
          notes: renewalNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Renewal failed');

      setActionMessage('License renewed successfully for 12 months.');
      setSelectedLicense(null);
      setRenewalPaymentRef('');
      setRenewalNotes('');
      fetchLicenses();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Renewal failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'x-xsrf-token': csrfToken },
      });
    } finally {
      onLogout();
    }
  };

  // Metrics
  const pendingCount = orders.filter((o) => o.status === 'verification_submitted').length;
  const approvedCount = orders.filter((o) => o.status === 'payment_approved').length;
  const totalVolume = approvedCount * 3499;

  return (
    <div className="admin-layout container">
      {/* Admin Top Header */}
      <div className="admin-header">
        <div>
          <span className="badge badge-brand" style={{ marginBottom: '0.4rem' }}>
            Protected Admin Control
          </span>
          <h2 style={{ fontSize: '1.75rem' }}>API Section Management Console</h2>
          <p style={{ fontSize: '0.85rem' }}>
            Logged in as <strong>{admin.username}</strong> ({admin.email})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onBackToStore}>
            Back to Public Website
          </button>
          <button type="button" className="btn btn-danger" onClick={handleLogoutClick}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Orders Recorded</div>
          <div className="stat-value">{ordersTotal}</div>
        </div>
        <div className="stat-card" style={{ borderColor: pendingCount > 0 ? '#f59e0b' : undefined }}>
          <div className="stat-label" style={{ color: pendingCount > 0 ? '#fbbf24' : undefined }}>
            Verification Pending Review
          </div>
          <div className="stat-value" style={{ color: pendingCount > 0 ? '#fbbf24' : undefined }}>
            {pendingCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Issued Licenses</div>
          <div className="stat-value">{licensesTotal || approvedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Verified Revenue</div>
          <div className="stat-value" style={{ color: '#38bdf8' }}>
            ₹{totalVolume.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="notice-box" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399', marginBottom: '1.5rem' }}>
          <Check size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="admin-nav-tabs">
        <button
          type="button"
          className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <FileText size={16} style={{ display: 'inline', marginRight: 6 }} />
          Orders & Payment Verification ({ordersTotal})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'licenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('licenses')}
        >
          <Key size={16} style={{ display: 'inline', marginRight: 6 }} />
          Issued Licenses & Renewals ({licensesTotal})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <ShieldAlert size={16} style={{ display: 'inline', marginRight: 6 }} />
          Security Audit Trail
        </button>
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && (
        <div>
          {/* Controls */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 260 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search order ref, customer, domain, or UTR..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
              <button type="button" className="btn btn-secondary" onClick={fetchOrders}>
                <Search size={16} />
              </button>
            </div>

            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="verification_submitted">Verification Pending Review</option>
              <option value="pending_payment">Pending Customer Payment</option>
              <option value="payment_approved">Approved & Licensed</option>
              <option value="payment_rejected">Rejected</option>
            </select>

            <button type="button" className="btn btn-secondary" onClick={fetchOrders} title="Refresh">
              <RefreshCw size={16} className={loadingOrders ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order Reference</th>
                  <th>Customer</th>
                  <th>Target Domain</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Submitted UTR</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No orders found matching criteria.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{o.order_ref}</td>
                      <td>
                        <div>{o.customer_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{o.customer_email}</div>
                      </td>
                      <td style={{ color: '#38bdf8' }}>{o.domain}</td>
                      <td>₹{o.amount_inr}</td>
                      <td>
                        {o.status === 'verification_submitted' && <span className="badge badge-pending">Review Needed</span>}
                        {o.status === 'payment_approved' && <span className="badge badge-approved">Approved</span>}
                        {o.status === 'pending_payment' && <span className="badge" style={{ background: '#1e293b', color: '#94a3b8' }}>Pending Transfer</span>}
                        {o.status === 'payment_rejected' && <span className="badge badge-rejected">Rejected</span>}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {o.utr_reference ? (
                          <strong style={{ color: '#f8fafc' }}>{o.utr_reference}</strong>
                        ) : (
                          <span style={{ color: '#64748b' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => {
                            setActionError(null);
                            setActionMessage(null);
                            setSelectedOrder(o);
                          }}
                        >
                          <Eye size={14} />
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LICENSES & RENEWALS */}
      {activeTab === 'licenses' && (
        <div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 260 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search license key, domain, customer, or order..."
                value={licenseSearch}
                onChange={(e) => setLicenseSearch(e.target.value)}
              />
              <button type="button" className="btn btn-secondary" onClick={fetchLicenses}>
                <Search size={16} />
              </button>
            </div>
            <button type="button" className="btn btn-secondary" onClick={fetchLicenses} title="Refresh">
              <RefreshCw size={16} className={loadingLicenses ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>License Key</th>
                  <th>Order Ref</th>
                  <th>Authorized Domain</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Activated On</th>
                  <th>Expires On (12 Mo.)</th>
                  <th>Renewals</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {licenses.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No licenses issued yet.
                    </td>
                  </tr>
                ) : (
                  licenses.map((lic) => (
                    <tr key={lic.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 600 }}>
                        {lic.license_key}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{lic.order_ref}</td>
                      <td style={{ fontWeight: 600 }}>{lic.domain}</td>
                      <td>
                        <div>{lic.customer_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{lic.customer_email}</div>
                      </td>
                      <td>
                        {lic.status === 'active' && <span className="badge badge-approved">Active</span>}
                        {lic.status === 'expired' && <span className="badge badge-expired">Expired</span>}
                        {lic.status === 'revoked' && <span className="badge badge-rejected">Revoked</span>}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {new Date(lic.activated_at).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: '0.82rem', fontWeight: 600, color: lic.status === 'active' ? '#34d399' : '#fb7185' }}>
                        {new Date(lic.expires_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span className="badge" style={{ background: '#1e293b' }}>
                          {lic.renewals?.length || 0} renewals
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => {
                            setActionError(null);
                            setSelectedLicense(lic);
                          }}
                        >
                          <Calendar size={14} />
                          Manual Renew
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              Immutable audit history of sensitive actions including logins, approvals, rejections, and renewals.
            </p>
            <button type="button" className="btn btn-secondary" onClick={fetchAuditLogs}>
              <RefreshCw size={16} className={loadingAudit ? 'animate-spin' : ''} />
              Refresh Log
            </button>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target Type</th>
                  <th>Target ID</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.78rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td>
                        <code style={{ color: '#818cf8', fontWeight: 600 }}>{log.action}</code>
                      </td>
                      <td>
                        <span className="badge" style={{ background: '#1e293b' }}>
                          {log.actor_type}: {log.actor_id || 'System'}
                        </span>
                      </td>
                      <td>{log.target_type || '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{log.target_id || '—'}</td>
                      <td style={{ fontSize: '0.8rem', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details || '—'}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{log.ip_address || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Order Review & Decision */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>Review Payment & Issue License</h3>
                <p style={{ fontSize: '0.85rem' }}>Order Ref: {selectedOrder.order_ref}</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedOrder(null)}>
                ×
              </button>
            </div>

            {actionError && (
              <div className="notice-box" style={{ background: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fb7185' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{actionError}</span>
              </div>
            )}

            <div style={{ background: '#090e17', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <table className="upi-info-table">
                <tbody>
                  <tr>
                    <td className="upi-info-label">Customer Name:</td>
                    <td className="upi-info-value">{selectedOrder.customer_name}</td>
                  </tr>
                  <tr>
                    <td className="upi-info-label">Customer Email:</td>
                    <td className="upi-info-value">{selectedOrder.customer_email}</td>
                  </tr>
                  <tr>
                    <td className="upi-info-label">Licensed Domain:</td>
                    <td className="upi-info-value" style={{ color: '#38bdf8' }}>{selectedOrder.domain}</td>
                  </tr>
                  <tr>
                    <td className="upi-info-label">Expected Amount:</td>
                    <td className="upi-info-value">₹{selectedOrder.amount_inr} {selectedOrder.currency}</td>
                  </tr>
                  <tr>
                    <td className="upi-info-label">Payee UPI ID:</td>
                    <td className="upi-info-value">{selectedOrder.upi_id}</td>
                  </tr>
                  <tr>
                    <td className="upi-info-label">Submitted UTR:</td>
                    <td className="upi-info-value">
                      <strong style={{ color: '#fbbf24', fontSize: '1.05rem' }}>
                        {selectedOrder.utr_reference || 'Not submitted yet'}
                      </strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="upi-info-label">Order Status:</td>
                    <td className="upi-info-value">{selectedOrder.status}</td>
                  </tr>
                </tbody>
              </table>

              {/* Uploaded Payment Proof */}
              {selectedOrder.proof_filename && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '0.5rem' }}>
                    Customer Uploaded Payment Proof:
                  </label>
                  <a
                    href={`/api/admin/proofs/${selectedOrder.proof_filename}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
                  >
                    <ExternalLink size={14} />
                    View / Download Proof ({selectedOrder.proof_original_name || 'receipt'})
                  </a>
                </div>
              )}
            </div>

            {selectedOrder.status !== 'payment_approved' && (
              <div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reject-reason">
                    Rejection Reason (Required only if rejecting)
                  </label>
                  <input
                    id="reject-reason"
                    type="text"
                    className="form-input"
                    placeholder="e.g. UTR reference not found in bank statement, amount mismatch..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={() => handleReject(selectedOrder.id)}
                    disabled={actionLoading}
                  >
                    <XCircle size={16} />
                    Reject Payment
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                    onClick={() => handleApprove(selectedOrder.id)}
                    disabled={actionLoading}
                  >
                    <CheckCircle size={16} />
                    Approve Payment & Issue License
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Manual Renewal */}
      {selectedLicense && (
        <div className="modal-backdrop" onClick={() => setSelectedLicense(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>Manual Annual License Renewal</h3>
                <p style={{ fontSize: '0.85rem' }}>Key: {selectedLicense.license_key}</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedLicense(null)}>
                ×
              </button>
            </div>

            {actionError && (
              <div className="notice-box" style={{ background: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fb7185' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleRenewLicense}>
              <div style={{ background: '#090e17', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div>Domain: <strong style={{ color: '#38bdf8' }}>{selectedLicense.domain}</strong></div>
                <div>Customer: <strong>{selectedLicense.customer_name}</strong></div>
                <div>Current Expiry Date: <strong style={{ color: '#fbbf24' }}>{new Date(selectedLicense.expires_at).toLocaleDateString()}</strong></div>
                <div style={{ marginTop: '0.5rem', color: '#10b981' }}>
                  → New Expiry Date will be extended by exactly 12 months after verified payment.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="renewal-utr">Verified Bank Renewal UTR / Payment Reference *</label>
                <input
                  id="renewal-utr"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 402910394012"
                  value={renewalPaymentRef}
                  onChange={(e) => setRenewalPaymentRef(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="renewal-notes">Internal Renewal Notes (Optional)</label>
                <input
                  id="renewal-notes"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Verified UPI transfer in Axis Bank statement for FY2026-27"
                  value={renewalNotes}
                  onChange={(e) => setRenewalNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedLicense(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Recording Renewal...' : 'Record Renewal & Extend Expiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
