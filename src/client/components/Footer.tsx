import React from 'react';
import { Mail, Layers, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onToggleAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onToggleAdmin }) => {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#0f172a', fontWeight: 800, marginBottom: '0.35rem' }}>
            <div className="logo-icon" style={{ width: 28, height: 28 }}>
              <Layers size={16} />
            </div>
            <span>API Section</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 420 }}>
            Official licensing portal for the Rich Text Editor API. Single-domain annual licensing at ₹3,499 INR (Incl. 18% GST).
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569' }}>
            <Mail size={14} />
            <span>Support: <strong>support@apisection.com</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569' }}>
            <ShieldCheck size={14} style={{ color: '#059669' }} />
            <span>Licensing: <strong>Single Domain (SAC 997331)</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
            onClick={onToggleAdmin}
          >
            Administrator Login
          </button>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            © {new Date().getFullYear()} API Section. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
};
