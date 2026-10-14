import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '3000', 10),

  // Secrets
  sessionSecret: process.env.SESSION_SECRET || 'dev_session_secret_digitons_dev_8f293b6e82a941e792c3f58a',
  csrfSecret: process.env.CSRF_SECRET || 'dev_csrf_secret_digitons_dev_4d812a67e912c9b4',

  // Database & storage
  dbPath: path.resolve(process.cwd(), process.env.DB_PATH || './data/sales_platform.db'),
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads/payment_proofs'),

  // Commercial configuration
  commercial: {
    productName: 'Rich Text Editor API',
    brandName: 'API Section',
    priceINR: 3499,
    currency: 'INR',
    billingPeriod: '1 Year (Annual)',
    licenseScope: 'One website/domain per active license',
    renewalTerms: 'Manual annual renewal. No automated recurring billing or silent charges.',
    paymentMethod: 'UPI / QR Code with Manual Verification',
    upiId: 'varunchauhan1998@ybl',
    upiPayeeName: 'API Section',
    activationTerms: 'License activation is processed exclusively after administrative verification of the payment reference / UTR.',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@apisection.com',
  },
};
