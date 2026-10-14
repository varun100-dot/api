import React from 'react';
import {
  Code2,
  FileCheck2,
  Globe,
  Keyboard,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

export const FeatureGrid: React.FC = () => {
  const features = [
    {
      icon: <FileCheck2 size={22} />,
      title: 'Clean Semantic HTML5 Output',
      desc: 'Produces clean, standards-compliant HTML5 and formatted elements without injecting unwanted inline styling or hidden tracking scripts.',
    },
    {
      icon: <Code2 size={22} />,
      title: 'JSON State Serialization',
      desc: 'Export editor document state seamlessly as structured JSON containing word counts, character counts, and sanitized content blocks for backend storage.',
    },
    {
      icon: <Globe size={22} />,
      title: 'One-Domain Commercial Scope',
      desc: 'Each license is bound to a single production website domain name (e.g. yourdomain.com). Clear terms without confusing tier traps.',
    },
    {
      icon: <Keyboard size={22} />,
      title: 'Standard Keyboard Shortcuts',
      desc: 'Includes natural keyboard shortcuts (Ctrl/Cmd+B for bold, Ctrl/Cmd+I for italic, Ctrl/Cmd+U for underline) for high productivity.',
    },
    {
      icon: <Sliders size={22} />,
      title: 'Customizable Toolbar Actions',
      desc: 'Easily trigger rich text formatting commands, headers, bulleted and numbered lists, quotes, and links through lightweight JavaScript methods.',
    },
    {
      icon: <ShieldCheck size={22} />,
      title: 'Manual Annual Renewal Terms',
      desc: 'Renew annually with manual payment confirmation. No surprise automated credit card deductions or lock-in contracts.',
    },
  ];

  return (
    <section className="features-section" id="features">
      <div className="container">
        <div className="section-head">
          <span className="badge badge-brand" style={{ marginBottom: '0.75rem' }}>
            Supported Capabilities
          </span>
          <h2 className="section-title">Built for Clean, Dependable Web Integration</h2>
          <p className="section-subtitle">
            Capabilities verified in the core implementation. Engineered for reliability without unnecessary framework dependencies.
          </p>
        </div>

        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon-wrapper">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
