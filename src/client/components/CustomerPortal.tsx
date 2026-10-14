import React, { useState } from 'react';
import {
  User,
  Key,
  Clock,
  Printer,
  AlertCircle,
  Copy,
  Check,
  LogOut,
  FileText,
  CreditCard,
  Mail,
} from 'lucide-react';

interface CustomerPortalProps {
  csrfToken: string;
  customerData: any | null;
  onCustomerChange: (data: any | null) => void;
  onOpenPurchase: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  csrfToken,
  customerData,
  onCustomerChange,
  onOpenPurchase,
}) => {
  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Email invoice state
  const [emailingOrder, setEmailingOrder] = useState<string | null>(null);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendInvoiceEmail = async (orderRef: string) => {
    setEmailingOrder(orderRef);
    setEmailSuccessMsg(null);
    try {
      const res = await fetch(`/api/customer/invoices/${orderRef}/email`, {
        method: 'POST',
        headers: {
          'x-xsrf-token': csrfToken,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setEmailSuccessMsg(data.message || `Tax invoice dispatched to your email.`);
        setTimeout(() => setEmailSuccessMsg(null), 6000);
      } else {
        alert(data.message || 'Failed to dispatch invoice email.');
      }
    } catch {
      alert('Network error while requesting invoice email.');
    } finally {
      setEmailingOrder(null);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = authMode === 'register' ? '/api/customer/register' : '/api/customer/login';
      const payload = authMode === 'register' ? { name, email, password } : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xsrf-token': csrfToken,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Authentication failed');
      }

      // Fetch full profile with licenses and bills
      const meRes = await fetch('/api/customer/me');
      const meData = await meRes.json();
      if (meRes.ok) {
        onCustomerChange(meData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/customer/logout', {
        method: 'POST',
        headers: { 'x-xsrf-token': csrfToken },
      });
    } finally {
      onCustomerChange(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="container" id="customer-account" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Section Header */}
        <div className="section-head" style={{ marginBottom: '2rem' }}>
          <span className="badge badge-brand" style={{ marginBottom: '0.5rem' }}>
            Account & Billing
          </span>
          <h2 className="section-title">My Account</h2>
          <p className="section-subtitle">
            Manage your API Section license subscription, check remaining days, view billing records, and generate official invoices.
          </p>
        </div>

        {/* NOT LOGGED IN: Simple Register / Login Box */}
        {!customerData ? (
          <div style={{ maxWidth: 440, margin: '0 auto', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '2.25rem', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', background: '#f1f5f9', padding: '4px', borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                className={`tab-btn ${authMode === 'register' ? 'active' : ''}`}
                style={{ flex: 1, padding: '0.55rem', textAlign: 'center', fontSize: '0.88rem' }}
                onClick={() => { setAuthMode('register'); setError(null); }}
              >
                Create Account
              </button>
              <button
                type="button"
                className={`tab-btn ${authMode === 'login' ? 'active' : ''}`}
                style={{ flex: 1, padding: '0.55rem', textAlign: 'center', fontSize: '0.88rem' }}
                onClick={() => { setAuthMode('login'); setError(null); }}
              >
                Sign In
              </button>
            </div>

            {error && (
              <div className="notice-box" style={{ background: '#ffe4e6', borderColor: '#fecdd3', color: '#be123c', marginBottom: '1.25rem' }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="cust-name">Full Name</label>
                  <input
                    id="cust-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Varun Chauhan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="cust-email">Email Address</label>
                <input
                  id="cust-email"
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cust-pass">Password</label>
                <input
                  id="cust-pass"
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                {loading
                  ? 'Processing...'
                  : authMode === 'register'
                  ? 'Create Account & Access Portal'
                  : 'Sign In to My Account'}
              </button>
            </form>
          </div>
        ) : (
          /* LOGGED IN CUSTOMER DASHBOARD */
          <div>
            {/* Account Top Summary Banner */}
            <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.2rem', color: '#0f172a' }}>{customerData.customer.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{customerData.customer.email}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={onOpenPurchase}>
                  + Purchase License (₹3,499)
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={handleLogout}>
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>

            {/* SECTION 1: Active Licenses with DAYS LEFT countdown */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                <Key size={18} style={{ color: 'var(--primary)' }} />
                <span>Active API Licenses & Days Left</span>
              </h3>

              {customerData.licenses && customerData.licenses.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  {customerData.licenses.map((lic: any) => {
                    const days = lic.daysLeft;
                    const isExp = lic.isExpired;

                    return (
                      <div
                        key={lic.id}
                        style={{
                          background: '#ffffff',
                          border: `1px solid ${isExp ? '#fda4af' : days <= 30 ? '#fcd34d' : '#cbd5e1'}`,
                          borderRadius: 'var(--radius-lg)',
                          padding: '1.75rem',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        {/* Days Left Hero Indicator */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                          <span style={{ fontSize: '0.88rem', color: '#475569' }}>
                            Domain: <strong style={{ color: '#0284c7' }}>{lic.domain}</strong>
                          </span>
                          <span
                            className="badge"
                            style={{
                              background: isExp ? '#ffe4e6' : days <= 30 ? '#fef3c7' : '#d1fae5',
                              color: isExp ? '#be123c' : days <= 30 ? '#b45309' : '#047857',
                              border: `1px solid ${isExp ? '#f43f5e' : days <= 30 ? '#f59e0b' : '#10b981'}`,
                              fontSize: '0.85rem',
                              padding: '0.35rem 0.85rem',
                            }}
                          >
                            <Clock size={14} style={{ marginRight: 4 }} />
                            {isExp ? 'Expired' : `${days} Days Left`}
                          </span>
                        </div>

                        {/* License Key Box */}
                        <div style={{ marginBottom: '1.25rem' }}>
                          <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>
                            Commercial License Key (Bound to: {lic.domain}):
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
                            <code style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 600, letterSpacing: '0.04em' }}>
                              {lic.license_key}
                            </code>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => handleCopy(lic.license_key)}
                            >
                              {copiedKey === lic.license_key ? <Check size={12} /> : <Copy size={12} />}
                              {copiedKey === lic.license_key ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>

                        {/* Dates Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem', color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
                          <div>
                            <span style={{ color: '#64748b' }}>Activated: </span>
                            <strong>{new Date(lic.activated_at).toLocaleDateString()}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b' }}>Expires On: </span>
                            <strong style={{ color: isExp ? '#be123c' : '#047857' }}>
                              {new Date(lic.expires_at).toLocaleDateString()}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: 'var(--radius-md)', padding: '2rem', textAlign: 'center' }}>
                  <CreditCard size={32} style={{ color: '#94a3b8', margin: '0 auto 0.75rem' }} />
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem', color: '#0f172a' }}>No Active Licenses Yet</h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: 440, margin: '0 auto 1.25rem' }}>
                    Purchase your ₹3,499 annual commercial license. Once verified by administrators, your live days countdown and active key will appear here.
                  </p>
                  <button type="button" className="btn btn-primary" onClick={onOpenPurchase}>
                    Purchase License (₹3,499)
                  </button>
                </div>
              )}
            </div>

            {/* SECTION 2: Billing & Generate Invoice */}
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                <FileText size={18} style={{ color: '#0284c7' }} />
                <span>Billing History & Generate Invoice</span>
              </h3>

              {emailSuccessMsg && (
                <div className="notice-box" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.25rem' }}>
                  <Check size={18} style={{ flexShrink: 0 }} />
                  <span>{emailSuccessMsg}</span>
                </div>
              )}

              {customerData.invoices && customerData.invoices.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {customerData.invoices.map((inv: any) => (
                    <div
                      key={inv.invoiceNumber}
                      className="invoice-sheet"
                    >
                      {/* Invoice Top Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                        <div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
                            API SECTION
                          </div>
                          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            Official Commercial License Receipt • GST Tax Invoice
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="badge badge-brand" style={{ marginBottom: '0.4rem' }}>
                            Digital Tax Invoice
                          </span>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                            {inv.invoiceNumber}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Date of Issue: {new Date(inv.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Billed To / Payee Details */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>Billed To:</span>
                          <strong style={{ color: '#0f172a' }}>{inv.customer.name}</strong>
                          <div style={{ color: '#0284c7', fontWeight: 600 }}>Authorized Domain: {inv.customer.domain}</div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>Payment Method:</span>
                          <div>Mode: <strong>Digital / Online Transfer (Verified)</strong></div>
                          <div>Payee: <strong>{inv.seller.payeeName}</strong></div>
                          <div>UTR / Reference: <code style={{ color: '#0f172a', fontWeight: 600, background: '#f1f5f9', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>{inv.utrReference || 'Verified Admin Approval'}</code></div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>Payment Status:</span>
                          <span
                            className="badge"
                            style={{
                              background: inv.status === 'payment_approved' ? '#d1fae5' : '#fef3c7',
                              color: inv.status === 'payment_approved' ? '#047857' : '#b45309',
                              border: `1px solid ${inv.status === 'payment_approved' ? '#a7f3d0' : '#fde68a'}`,
                              padding: '0.35rem 0.75rem',
                            }}
                          >
                            {inv.paymentStatus}
                          </span>
                        </div>
                      </div>

                      {/* Itemized Invoice Table with 18% Tax */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Description & Service Code</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>SAC</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#475569', fontWeight: 600 }}>Taxable Value</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#475569', fontWeight: 600 }}>Tax (18% GST)</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#475569', fontWeight: 600 }}>Total (INR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.85rem 1rem', color: '#1e293b' }}>
                              <strong>API Section Rich Text Editor API</strong>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                1-Year Single-Domain Commercial License • Bound to: {inv.customer.domain}
                              </div>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                              997331
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#0f172a' }}>
                              ₹{inv.subtotalINR ? inv.subtotalINR.toFixed(2) : '2,965.25'}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#0f172a' }}>
                              ₹{inv.taxAmountINR ? inv.taxAmountINR.toFixed(2) : '533.75'} (18%)
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                              ₹{inv.totalAmountINR}.00
                            </td>
                          </tr>

                          {/* Tax Breakdown Rows */}
                          <tr>
                            <td colSpan={4} style={{ padding: '0.4rem 1rem', textAlign: 'right', color: '#64748b', fontSize: '0.82rem' }}>
                              Taxable Subtotal (Net Amount):
                            </td>
                            <td style={{ padding: '0.4rem 1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                              ₹{inv.subtotalINR ? inv.subtotalINR.toFixed(2) : '2,965.25'}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={4} style={{ padding: '0.4rem 1rem', textAlign: 'right', color: '#64748b', fontSize: '0.82rem' }}>
                              Central GST (CGST @ 9%):
                            </td>
                            <td style={{ padding: '0.4rem 1rem', textAlign: 'right', color: '#0f172a', fontSize: '0.85rem' }}>
                              ₹{inv.cgstINR ? inv.cgstINR.toFixed(2) : '266.88'}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={4} style={{ padding: '0.4rem 1rem', textAlign: 'right', color: '#64748b', fontSize: '0.82rem' }}>
                              State GST (SGST @ 9%):
                            </td>
                            <td style={{ padding: '0.4rem 1rem', textAlign: 'right', color: '#0f172a', fontSize: '0.85rem' }}>
                              ₹{inv.sgstINR ? inv.sgstINR.toFixed(2) : '266.87'}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={4} style={{ padding: '0.4rem 1rem', textAlign: 'right', color: '#4f46e5', fontWeight: 600, fontSize: '0.82rem' }}>
                              Total Tax (18% GST Included):
                            </td>
                            <td style={{ padding: '0.4rem 1rem', textAlign: 'right', fontWeight: 600, color: '#4f46e5', fontSize: '0.85rem' }}>
                              ₹{inv.taxAmountINR ? inv.taxAmountINR.toFixed(2) : '533.75'}
                            </td>
                          </tr>

                          {/* Grand Total Row */}
                          <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                            <td colSpan={4} style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                              Grand Total Paid (INR):
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#4f46e5', fontSize: '1.15rem' }}>
                              ₹{inv.totalAmountINR.toLocaleString('en-IN')}.00 INR
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Official Digital Invoice Footer (Standard Digital Bill Elements) */}
                      <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '1.25rem', marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', fontSize: '0.8rem', color: '#475569' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.75rem' }}>
                            Terms of Supply & Licensing Conditions:
                          </div>
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.5 }}>
                            <li>• <strong>Service Category:</strong> SAC 997331 (Licensing services for the right to use computer software).</li>
                            <li>• <strong>Grant Scope:</strong> Single designated website domain ({inv.customer.domain}) for 365 calendar days.</li>
                            <li>• <strong>Electronic Record:</strong> This is a computer-generated digital invoice generated in compliance with electronic transaction standards. No physical signature is required.</li>
                            <li>• <strong>Official Website:</strong> <a href="https://apisection.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>https://apisection.vercel.app/</a></li>
                          </ul>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                          <div style={{ border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)', padding: '0.75rem 1.25rem', background: '#f8fafc', textAlign: 'center', minWidth: 240 }}>
                            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                              Digitally Certified & Approved
                            </div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', margin: '0.25rem 0' }}>
                              API SECTION
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                              ✓ Authorized Digital Signatory
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                              Ref: {inv.orderRef}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Printable Action Bar */}
                      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Official API Section commercial receipt. Authorized for domain <strong>{inv.customer.domain}</strong>.
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
                            onClick={() => handleSendInvoiceEmail(inv.orderRef)}
                            disabled={emailingOrder === inv.orderRef}
                          >
                            <Mail size={15} />
                            {emailingOrder === inv.orderRef ? 'Sending to Email...' : 'Send Invoice to Email'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
                            onClick={handlePrint}
                          >
                            <Printer size={15} />
                            Generate & Print Invoice
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                  No billing invoices generated yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
