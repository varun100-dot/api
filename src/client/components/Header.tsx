import React from 'react';
import { Layers, User, Shield } from 'lucide-react';

interface HeaderProps {
  onToggleAdmin: () => void;
  isAdminLoggedIn: boolean;
  viewingAdmin: boolean;
  customerData: any | null;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleAdmin,
  isAdminLoggedIn,
  viewingAdmin,
  customerData,
}) => {
  const handleAccountClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (viewingAdmin) {
      onToggleAdmin();
    }
    const accountEl = document.getElementById('customer-account');
    if (accountEl) {
      accountEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="header">
      <div className="container header-inner">
        {/* Brand Identity: API Section */}
        <a
          href="#"
          className="logo"
          onClick={(e) => {
            e.preventDefault();
            if (viewingAdmin) onToggleAdmin();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <div className="logo-icon">
            <Layers size={20} />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a' }}>
              API
            </span>
            <span style={{ color: '#4f46e5', fontWeight: 700, marginLeft: '5px', fontSize: '1.25rem' }}>
              Section
            </span>
          </div>
        </a>

        {/* Clean, Uncluttered Right Side: ONLY My Account */}
        <div className="header-right-actions">
          {!viewingAdmin ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAccountClick}
                style={{ padding: '0.55rem 1.2rem', fontSize: '0.9rem' }}
              >
                <User size={16} />
                <span>
                  {customerData?.customer ? `My Account (${customerData.customer.name.split(' ')[0]})` : 'My Account'}
                </span>
              </button>

              {/* Discreet Admin Link */}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                onClick={onToggleAdmin}
                title={isAdminLoggedIn ? 'Admin (Active)' : 'Admin Login'}
              >
                <Shield size={14} style={{ color: isAdminLoggedIn ? '#059669' : undefined }} />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.55rem 1.1rem', fontSize: '0.9rem' }}
              onClick={onToggleAdmin}
            >
              Public Website
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
