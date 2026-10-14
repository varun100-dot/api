import React, { useState } from 'react';
import { X, Search, CheckCircle2, Clock, AlertCircle, Key, Copy, Check } from 'lucide-react';

interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  csrfToken: string;
}

export const OrderStatusModal: React.FC<OrderStatusModalProps> = ({ isOpen, onClose, csrfToken }) => {
  const [orderRefInput, setOrderRefInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Re-submission state if rejected or pending
  const [newUtr, setNewUtr] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);

  if (!isOpen) return null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!orderRefInput.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderRefInput.trim()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Order not found');
      }
      setOrderData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleReSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderData || !newUtr.trim()) return;

    setSubmittingUtr(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('utrReference', newUtr.trim());

      const res = await fetch(`/api/orders/${orderData.orderRef}/payment`, {
        method: 'POST',
        headers: {
          'x-xsrf-token': csrfToken,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Submission failed');
      }

      // Refresh order data
      const refreshRes = await fetch(`/api/orders/${orderData.orderRef}`);
      const refreshedData = await refreshRes.json();
      setOrderData(refreshedData);
      setNewUtr('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment submission failed');
    } finally {
      setSubmittingUtr(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Lookup Order & License</h3>
            <p style={{ fontSize: '0.85rem' }}>Check manual verification status or retrieve your active license key.</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleLookup} style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. DIG-ORD-20261014-ABC12"
              value={orderRefInput}
              onChange={(e) => setOrderRefInput(e.target.value.toUpperCase())}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Search size={16} />
              {loading ? 'Finding...' : 'Track'}
            </button>
          </div>
        </form>

        {error && (
          <div className="notice-box" style={{ background: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fb7185' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        {orderData && (
          <div style={{ background: '#090e17', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Order Ref:</span>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{orderData.orderRef}</div>
              </div>
              <div>
                {orderData.status === 'payment_approved' && <span className="badge badge-approved">Approved & Active</span>}
                {orderData.status === 'verification_submitted' && <span className="badge badge-pending">Verification Pending</span>}
                {orderData.status === 'pending_payment' && <span className="badge badge-pending">Payment Required</span>}
                {orderData.status === 'payment_rejected' && <span className="badge badge-rejected">Verification Rejected</span>}
              </div>
            </div>

            <table className="upi-info-table" style={{ marginBottom: '1.25rem' }}>
              <tbody>
                <tr>
                  <td className="upi-info-label">Customer:</td>
                  <td className="upi-info-value">{orderData.customerName} ({orderData.customerEmail})</td>
                </tr>
                <tr>
                  <td className="upi-info-label">Target Domain:</td>
                  <td className="upi-info-value">{orderData.domain}</td>
                </tr>
                <tr>
                  <td className="upi-info-label">Annual Price:</td>
                  <td className="upi-info-value">₹{orderData.amountINR} {orderData.currency}</td>
                </tr>
                {orderData.utrReference && (
                  <tr>
                    <td className="upi-info-label">Submitted UTR:</td>
                    <td className="upi-info-value">{orderData.utrReference}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Approved & Active License View */}
            {orderData.status === 'payment_approved' && orderData.license && (
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 700, marginBottom: '0.75rem' }}>
                  <CheckCircle2 size={18} />
                  <span>Production License Active</span>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                    Commercial License Key (Bound to: {orderData.license.domain})
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#090e17', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <Key size={14} style={{ color: '#818cf8' }} />
                    <code style={{ fontSize: '0.95rem', color: '#38bdf8', flex: 1, letterSpacing: '0.05em' }}>
                      {orderData.license.licenseKey}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyKey(orderData.license.licenseKey)}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      {copiedKey ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem', color: '#cbd5e1' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Activated On: </span>
                    {new Date(orderData.license.activatedAt).toLocaleDateString()}
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Valid Until: </span>
                    <strong style={{ color: '#34d399' }}>{new Date(orderData.license.expiresAt).toLocaleDateString()}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Pending View */}
            {orderData.status === 'verification_submitted' && (
              <div className="notice-box" style={{ marginTop: '1rem' }}>
                <Clock size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Manual Review in Progress:</strong> Your payment reference <code>{orderData.utrReference}</code> is awaiting administrative verification. Please allow up to 24 hours for review. Check back here anytime using your order reference.
                </div>
              </div>
            )}

            {/* Rejection View & Resubmission Form */}
            {orderData.status === 'payment_rejected' && (
              <div style={{ marginTop: '1rem' }}>
                <div className="notice-box" style={{ background: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fb7185' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Verification Rejected:</strong> {orderData.rejectionReason || 'The payment reference could not be matched against bank records.'}
                  </div>
                </div>

                <form onSubmit={handleReSubmitUtr} style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="resubmit-utr">Enter Correct UTR / Reference Number</label>
                    <input
                      id="resubmit-utr"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 328492049182"
                      value={newUtr}
                      onChange={(e) => setNewUtr(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submittingUtr}>
                    {submittingUtr ? 'Submitting...' : 'Re-submit for Review'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
