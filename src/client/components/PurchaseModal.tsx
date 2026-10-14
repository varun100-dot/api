import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Upload,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  csrfToken: string;
  customerData?: any | null;
  onOrderComplete?: () => void;
}

interface OrderData {
  orderRef: string;
  customerName: string;
  customerEmail: string;
  domain: string;
  amountINR: number;
  currency: string;
  status: string;
  createdAt: string;
  utrReference?: string | null;
}

interface PaymentDetails {
  upiId: string;
  payeeName: string;
  amountINR: number;
  orderRef: string;
  currency: string;
  upiUri: string;
  qrDataUrl: string;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  onClose,
  csrfToken,
  customerData,
  onOrderComplete,
}) => {
  const [step, setStep] = useState<'details' | 'payment' | 'submitted'>('details');

  // Form State
  const [customerName, setCustomerName] = useState(customerData?.customer?.name || '');
  const [customerEmail, setCustomerEmail] = useState(customerData?.customer?.email || '');
  const [domain, setDomain] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Sync if customerData changes
  React.useEffect(() => {
    if (customerData?.customer) {
      if (!customerName) setCustomerName(customerData.customer.name);
      if (!customerEmail) setCustomerEmail(customerData.customer.email);
    }
  }, [customerData]);

  // Payment Verification State
  const [order, setOrder] = useState<OrderData | null>(null);
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [utrReference, setUtrReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    if (payment?.upiId) {
      navigator.clipboard.writeText(payment.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!agreedTerms) {
      setErrorMessage('You must acknowledge the single-domain license and manual renewal terms.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xsrf-token': csrfToken,
        },
        body: JSON.stringify({ customerName, customerEmail, domain }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || (data.details ? Object.values(data.details).join(', ') : 'Order creation failed'));
      }

      setOrder(data.order);
      setPayment(data.payment);
      setStep('payment');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred while creating order');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!order) return;
    if (!utrReference.trim() || utrReference.trim().length < 6) {
      setErrorMessage('Please enter a valid Bank UTR / Transaction Reference Number (min 6 characters).');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('utrReference', utrReference.trim());
      if (proofFile) {
        formData.append('proofFile', proofFile);
      }

      const res = await fetch(`/api/orders/${order.orderRef}/payment`, {
        method: 'POST',
        headers: {
          'x-xsrf-token': csrfToken,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Payment submission failed');
      }

      setOrder(data.order);
      setStep('submitted');
      if (onOrderComplete) {
        onOrderComplete();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit payment verification');
    } finally {
      setLoading(false);
    }
  };

  const handleResetModal = () => {
    setStep('details');
    setCustomerName('');
    setCustomerEmail('');
    setDomain('');
    setAgreedTerms(false);
    setOrder(null);
    setPayment(null);
    setUtrReference('');
    setProofFile(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleResetModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
              {step === 'details' && 'Purchase Commercial API License'}
              {step === 'payment' && 'Complete Payment via UPI / QR'}
              {step === 'submitted' && 'Verification Submitted'}
            </h3>
            <p style={{ fontSize: '0.85rem' }}>
              {step === 'details' && 'API Section Rich Text Editor (₹3,499 / Year)'}
              {step === 'payment' && `Order Reference: ${order?.orderRef}`}
              {step === 'submitted' && `Order Reference: ${order?.orderRef}`}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={handleResetModal} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="notice-box" style={{ background: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fb7185' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Customer & Domain Details */}
        {step === 'details' && (
          <form onSubmit={handleCreateOrder}>
            <div className="form-group">
              <label className="form-label" htmlFor="customer-name">Full Name / Organization</label>
              <input
                id="customer-name"
                type="text"
                className="form-input"
                placeholder="e.g. John Doe or Acme Corp"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="customer-email">Email Address</label>
              <input
                id="customer-email"
                type="email"
                className="form-input"
                placeholder="developer@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
              <p className="form-hint">Order confirmations and license credentials will be sent to this email.</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="domain-name">Intended Website Domain Name</label>
              <input
                id="domain-name"
                type="text"
                className="form-input"
                placeholder="e.g. blog.yourdomain.com or myapp.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
              />
              <p className="form-hint">One active domain per license. Subdomains (e.g., app.domain.com) count as individual domains.</p>
            </div>

            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  style={{ marginTop: 3 }}
                  required
                />
                <span>
                  I understand this is an annual single-domain commercial license at <strong>₹3,499 INR</strong> with manual annual renewal and manual administrative payment verification.
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={handleResetModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Generating Order...' : 'Continue to Payment (₹3,499)'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: UPI Payment & UTR Submission */}
        {step === 'payment' && payment && (
          <form onSubmit={handleSubmitPayment}>
            <div className="upi-pay-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#a5b4fc', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <Sparkles size={14} />
                <span>Scan with any UPI Banking App (GPay, PhonePe, Paytm, BHIM)</span>
              </div>

              {/* Exact NPCI UPI QR code */}
              <img
                src={payment.qrDataUrl}
                alt="Genuine NPCI UPI Payment QR Code"
                className="qr-preview-img"
              />

              <table className="upi-info-table">
                <tbody>
                  <tr>
                    <td className="upi-info-label">Payee Name:</td>
                    <td className="upi-info-value">{payment.payeeName}</td>
                  </tr>
                  <tr>
                    <td className="upi-info-label">UPI ID:</td>
                    <td className="upi-info-value">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{payment.upiId}</span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          style={{ background: 'transparent', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px' }}
                        >
                          {copiedUpi ? <Check size={12} /> : <Copy size={12} />}
                          {copiedUpi ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="upi-info-label">Base Amount:</td>
                    <td className="upi-info-value">₹2,965.25 INR</td>
                  </tr>
                  <tr>
                    <td className="upi-info-label">Tax (18% GST):</td>
                    <td className="upi-info-value" style={{ color: '#059669' }}>+ ₹533.75 INR</td>
                  </tr>
                  <tr>
                    <td className="upi-info-label">Total to Pay:</td>
                    <td className="upi-info-value" style={{ color: '#4f46e5', fontWeight: 800, fontSize: '1.05rem' }}>
                      ₹{payment.amountINR} {payment.currency} (All Taxes Included)
                    </td>
                  </tr>
                  <tr>
                    <td className="upi-info-label">Order Ref:</td>
                    <td className="upi-info-value">{payment.orderRef}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: '1rem' }}>
                <a
                  href={payment.upiUri}
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.85rem', padding: '0.6rem' }}
                >
                  <ExternalLink size={14} />
                  Open in UPI App (Mobile)
                </a>
              </div>
            </div>

            <div className="notice-box">
              <Clock size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Manual Verification Policy:</strong> After making the UPI transfer, enter your 12-digit UTR / Transaction Reference Number below. License activation is processed only after manual verification by API Section administrators.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="utr-ref">Bank UTR / Transaction Reference Number *</label>
              <input
                id="utr-ref"
                type="text"
                className="form-input"
                placeholder="e.g. 328492049182 or UPI Ref ID"
                value={utrReference}
                onChange={(e) => setUtrReference(e.target.value)}
                required
              />
              <p className="form-hint">Found in your UPI application's payment receipt details.</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="proof-file">Optional Payment Screenshot / Proof</label>
              <input
                id="proof-file"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.pdf"
                className="form-input"
                style={{ padding: '0.5rem' }}
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
              <p className="form-hint">Allowed formats: PNG, JPG, WEBP, PDF (Max 5MB).</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                <Upload size={16} />
                {loading ? 'Submitting Verification...' : 'Submit Payment for Verification'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Submitted Confirmation */}
        {step === 'submitted' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <Clock size={32} />
            </div>
            <h4 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Payment Submitted for Verification</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: 440, margin: '0 auto 1.5rem' }}>
              Your order <code style={{ color: '#38bdf8' }}>{order?.orderRef}</code> and UTR reference <code style={{ color: '#f1f5f9' }}>{order?.utrReference}</code> have been recorded.
            </p>

            <div className="notice-box" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Next Step:</strong> An administrator from API Section will verify the bank transaction against payee <code>varunchauhan1998@ybl</code>. Upon verification, your license key will be issued for domain <code>{domain}</code>.
              </div>
            </div>

            <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={handleResetModal}>
              Close & Track Order Status
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
