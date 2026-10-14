import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Search } from 'lucide-react';

export const LicenseVerifierWidget: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim() || !licenseKey.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim(),
          licenseKey: licenseKey.trim(),
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setResult({
        valid: false,
        error: err instanceof Error ? err.message : 'Verification check failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container" id="license-verify" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', maxWidth: 880, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span className="badge badge-brand" style={{ marginBottom: '0.5rem' }}>
            Public Registry Check
          </span>
          <h3 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Domain License Verification Tool</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: 640, margin: '0 auto' }}>
            Test whether a commercial license key is currently active and bound to a specific authorized website domain in the API Section database.
          </p>
        </div>

        <form onSubmit={handleVerify} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Domain (e.g. blog.example.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
          />
          <input
            type="text"
            className="form-input"
            placeholder="License Key (e.g. DIG-XXXX-XXXX-XXXX-XXXX)"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Search size={16} />
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        {result && (
          <div style={{
            background: result.valid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
            border: `1px solid ${result.valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {result.valid ? (
                <CheckCircle2 size={18} style={{ color: '#34d399' }} />
              ) : (
                <AlertCircle size={18} style={{ color: '#fb7185' }} />
              )}
              <strong style={{ color: result.valid ? '#34d399' : '#fb7185' }}>
                {result.valid ? 'License Verified & Active' : 'Verification Status: Not Authorized'}
              </strong>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginBottom: '0.75rem' }}>
              {result.message}
            </p>

            {result.expires_at && (
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                Expiry Date: <strong style={{ color: '#f8fafc' }}>{new Date(result.expires_at).toLocaleDateString()}</strong>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', padding: '0.85rem 1rem', background: '#090e17', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.78rem', color: '#94a3b8' }}>
          <strong>Notice on Enforcement Architecture:</strong> This verification tool checks records landed in the sales registry. License binding and technical runtime validation are configured within your frontend deployment using the Rich Text Editor API configuration.
        </div>
      </div>
    </section>
  );
};
