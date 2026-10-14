import React from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Globe2, RefreshCw } from 'lucide-react';

interface HeroProps {
  onOpenPurchase: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenPurchase }) => {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-pill">
          <span className="badge badge-brand">
            <Sparkles size={12} />
            API Section • Rich Text Editor Release
          </span>
        </div>

        <h1 className="hero-title">
          Lightweight, Robust <span className="hero-highlight">Rich Text Editor API</span> for Web Applications
        </h1>

        <p className="hero-subtitle">
          Embed a sleek, semantic rich-text composing engine directly into your CMS, dashboard, or SaaS platform. Backed by single-domain commercial licensing and transparent annual renewal terms.
        </p>

        <div className="hero-actions">
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}
            onClick={onOpenPurchase}
          >
            <span>Get Commercial License — ₹3,499/yr</span>
            <ArrowRight size={18} />
          </button>

          <a href="#editor-demo" className="btn btn-secondary" style={{ padding: '0.9rem 1.75rem', fontSize: '1.05rem' }}>
            Try Interactive Sandbox
          </a>
        </div>

        <div className="hero-meta">
          <div className="hero-meta-item">
            <ShieldCheck size={16} style={{ color: '#34d399' }} />
            <span>₹3,499 INR / Year Transparent Price</span>
          </div>
          <div className="hero-meta-item">
            <Globe2 size={16} style={{ color: '#38bdf8' }} />
            <span>One Website / Domain per License</span>
          </div>
          <div className="hero-meta-item">
            <RefreshCw size={16} style={{ color: '#fbbf24' }} />
            <span>Manual Annual Renewal (No Auto-Charges)</span>
          </div>
          <div className="hero-meta-item">
            <CheckCircle2 size={16} style={{ color: '#a5b4fc' }} />
            <span>UPI Verified Onboarding</span>
          </div>
        </div>
      </div>
    </section>
  );
};
