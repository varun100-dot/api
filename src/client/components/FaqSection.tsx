import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What is included in the ₹3,499 INR annual commercial license?',
      a: 'The license grants full commercial authorization to embed and use the API Section Rich Text Editor API on one production website domain for exactly 12 months from the activation date. It includes all core editing capabilities, HTML5 sanitization, JSON AST export, and standard technical support via email.',
    },
    {
      q: 'What is meant by the "one website / domain" license scope?',
      a: 'Each license key is explicitly assigned to a single domain name (for example, blog.example.com or mycompany.com). If you run multiple distinct platforms or subdomains with separate deployments, each requires its own active commercial license.',
    },
    {
      q: 'How does the UPI payment and manual verification process work?',
      a: 'After filling in your name, email, and target domain, a unique order reference is generated for ₹3,499 INR along with the verified payee UPI ID and an NPCI-compliant QR code. Once you transfer the amount through your UPI app, submit your 12-digit bank UTR reference. An API Section administrator reviews the transfer and activates your license upon manual confirmation.',
    },
    {
      q: 'Will my credit card or bank account be charged automatically on renewal?',
      a: 'No. API Section operates on a strict manual annual renewal model. We do not store card details or automate recurring debits. When your license approaches its 12-month expiry, you can manually renew it through a verified UPI payment.',
    },
    {
      q: 'What is the distinction between this portal and API runtime enforcement?',
      a: 'This sales portal acts as the authoritative licensing registry, customer account portal, and administrative verification system. Domain enforcement and license authorization in client applications are implemented by providing your issued license key into the editor initialization configuration.',
    },
    {
      q: 'Where can I access the official API platform and track my orders?',
      a: 'You can access the official API Section portal directly at https://apisection.vercel.app/. Sign in to your account anytime to check active licenses, track remaining days, and access digital tax bills.',
    },
  ];

  return (
    <section className="faq-section" id="faq">
      <div className="container">
        <div className="section-head">
          <span className="badge badge-brand" style={{ marginBottom: '0.75rem' }}>
            Got Questions?
          </span>
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">
            Everything you need to know about API Section licensing, UPI payments, and domain scope.
          </p>
        </div>

        <div className="faq-accordion">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="faq-item">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  style={{
                    background: 'transparent',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textAlign: 'left',
                    color: 'inherit',
                  }}
                >
                  <span className="faq-question" style={{ marginBottom: 0 }}>
                    {item.q}
                  </span>
                  <span style={{ color: '#818cf8', marginLeft: '1rem' }}>
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </span>
                </button>
                {isOpen && (
                  <p style={{ marginTop: '0.75rem', fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
