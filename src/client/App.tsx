import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { Hero } from './components/Hero.js';
import { EditorDemo } from './components/EditorDemo.js';
import { FeatureGrid } from './components/FeatureGrid.js';
import { PricingSection } from './components/PricingSection.js';
import { LicenseVerifierWidget } from './components/LicenseVerifierWidget.js';
import { FaqSection } from './components/FaqSection.js';
import { Footer } from './components/Footer.js';
import { PurchaseModal } from './components/PurchaseModal.js';
import { OrderStatusModal } from './components/OrderStatusModal.js';
import { CustomerPortal } from './components/CustomerPortal.js';
import { AdminLogin } from './admin/AdminLogin.js';
import { AdminDashboard } from './admin/AdminDashboard.js';

export const App: React.FC = () => {
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [viewingAdmin, setViewingAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<{ id: number; username: string; email: string } | null>(null);
  const [customerData, setCustomerData] = useState<any | null>(null);

  const fetchCustomerProfile = async () => {
    try {
      const res = await fetch('/api/customer/me');
      if (res.ok) {
        const data = await res.json();
        setCustomerData(data);
      } else {
        setCustomerData(null);
      }
    } catch {
      setCustomerData(null);
    }
  };

  // Initialize CSRF Token & Check Existing Sessions
  useEffect(() => {
    const initApp = async () => {
      try {
        const csrfRes = await fetch('/api/csrf-token');
        const csrfData = await csrfRes.json();
        if (csrfData.csrfToken) {
          setCsrfToken(csrfData.csrfToken);
        }

        // Check if admin is already signed in
        const adminRes = await fetch('/api/admin/me');
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          if (adminData.authenticated && adminData.admin) {
            setAdminUser(adminData.admin);
          }
        }

        // Check if customer is signed in
        await fetchCustomerProfile();
      } catch (err) {
        console.error('Failed to initialize application session:', err);
      }
    };

    initApp();

    // Check URL hash or query params (e.g. #admin)
    if (window.location.hash === '#admin' || window.location.pathname.startsWith('/admin')) {
      setViewingAdmin(true);
    }
  }, []);

  const handleToggleAdmin = () => {
    setViewingAdmin((prev) => !prev);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <Header
        onToggleAdmin={handleToggleAdmin}
        isAdminLoggedIn={Boolean(adminUser)}
        viewingAdmin={viewingAdmin}
        customerData={customerData}
      />

      {viewingAdmin ? (
        adminUser ? (
          <AdminDashboard
            csrfToken={csrfToken}
            admin={adminUser}
            onLogout={() => {
              setAdminUser(null);
              setViewingAdmin(false);
            }}
            onBackToStore={() => setViewingAdmin(false)}
          />
        ) : (
          <AdminLogin
            csrfToken={csrfToken}
            onLoginSuccess={(admin) => setAdminUser(admin)}
            onBackToStore={() => setViewingAdmin(false)}
          />
        )
      ) : (
        <main>
          <Hero onOpenPurchase={() => setIsPurchaseOpen(true)} />
          <EditorDemo />
          <FeatureGrid />
          <PricingSection onOpenPurchase={() => setIsPurchaseOpen(true)} />
          <CustomerPortal
            csrfToken={csrfToken}
            customerData={customerData}
            onCustomerChange={(newData) => setCustomerData(newData)}
            onOpenPurchase={() => setIsPurchaseOpen(true)}
          />
          <LicenseVerifierWidget />
          <FaqSection />
        </main>
      )}

      <Footer onToggleAdmin={handleToggleAdmin} />

      {/* Customer Modals */}
      <PurchaseModal
        isOpen={isPurchaseOpen}
        onClose={() => setIsPurchaseOpen(false)}
        csrfToken={csrfToken}
        customerData={customerData}
        onOrderComplete={fetchCustomerProfile}
      />

      <OrderStatusModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        csrfToken={csrfToken}
      />
    </div>
  );
};
