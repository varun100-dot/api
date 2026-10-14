import React, { useState } from 'react';
import { Lock, AlertCircle, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  csrfToken: string;
  onLoginSuccess: (admin: { id: number; username: string; email: string }) => void;
  onBackToStore: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ csrfToken, onLoginSuccess, onBackToStore }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xsrf-token': csrfToken,
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Authentication failed');
      }

      onLoginSuccess(data.admin);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', boxShadow: 'var(--shadow-lg)' }}>
        <button
          type="button"
          onClick={onBackToStore}
          style={{ background: 'transparent', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}
        >
          <ArrowLeft size={16} />
          Back to Public Website
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 48, height: 48, background: 'var(--primary-light)', color: '#818cf8', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Lock size={24} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>API Section Admin Portal</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Sign in to verify payments and issue API licenses.
          </p>
        </div>

        {errorMessage && (
          <div className="notice-box" style={{ background: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fb7185' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-user">Username or Email</label>
            <input
              id="admin-user"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-pass">Password</label>
            <input
              id="admin-pass"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <p style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', marginTop: '1.5rem' }}>
          Admin accounts are provisioned exclusively via server-side CLI (`npm run admin:create`). Default credentials are never shipped.
        </p>
      </div>
    </div>
  );
};
