import React from 'react';
import { Check, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';

interface PricingSectionProps {
  onOpenPurchase: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onOpenPurchase }) => {
  return (
    <section className="pricing-section" id="pricing">
      <div className="container">
        <div className="section-head">
          <span className="badge badge-brand" style={{ marginBottom: '0.75rem' }}>
            Transparent Commercial Licensing
          </span>
          <h2 className="section-title">Simple, Predictable Annual Pricing</h2>
          <p className="section-subtitle">
            One comprehensive commercial license per website domain. No hidden charges, no seat limits, no forced auto-renewals.
          </p>
        </div>

        <div className="pricing-card-wrapper">
          <div className="pricing-card">
            <div className="pricing-popular-tag">
              <span className="badge badge-brand">Commercial License</span>
            </div>

            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              Rich Text Editor API License
            </div>
            <p style={{ fontSize: '0.88rem', marginTop: '0.25rem', color: '#64748b' }}>
              API Section Official Commercial Grant
            </p>

            <div className="pricing-price">
              <span className="price-currency">₹</span>
              <span className="price-number">3,499</span>
              <span className="price-period">INR / year (Incl. 18% GST)</span>
            </div>

            <div className="pricing-terms">
              <ShieldAlert size={14} />
              <span>Base ₹2,965.25 + 18% GST (₹533.75) • Manual annual renewal</span>
            </div>

            <ul className="pricing-features-list">
              <li className="pricing-feature-item">
                <Check size={18} className="pricing-feature-check" />
                <span><strong>Single Website / Domain Authorization:</strong> Valid for 1 primary domain.</span>
              </li>
              <li className="pricing-feature-item">
                <Check size={18} className="pricing-feature-check" />
                <span><strong>12 Months Active Validity:</strong> Exactly 365 days from activation date.</span>
              </li>
              <li className="pricing-feature-item">
                <Check size={18} className="pricing-feature-check" />
                <span><strong>Tax Invoice with 18% GST:</strong> Itemized tax bill generated with SAC code 997331.</span>
              </li>
              <li className="pricing-feature-item">
                <Check size={18} className="pricing-feature-check" />
                <span><strong>Full Editor API SDK Access:</strong> Core rich text engine, JSON and HTML exports.</span>
              </li>
              <li className="pricing-feature-item">
                <Check size={18} className="pricing-feature-check" />
                <span><strong>Dedicated Developer Support:</strong> Technical guidance via <code>support@apisection.com</code>.</span>
              </li>
              <li className="pricing-feature-item">
                <Check size={18} className="pricing-feature-check" />
                <span><strong>Live Account Portal:</strong> Instant days left countdown & digital invoice download.</span>
              </li>
            </ul>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem' }}
              onClick={onOpenPurchase}
            >
              <span>Purchase License for ₹3,499</span>
              <ArrowRight size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.78rem', marginTop: '1rem' }}>
              <ShieldCheck size={14} style={{ color: '#059669' }} />
              <span>API Section Commercial Grant • Instant invoice and live license tracking</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
