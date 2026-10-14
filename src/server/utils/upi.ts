import QRCode from 'qrcode';
import { config } from '../config.js';

export interface UpiPaymentDetails {
  upiId: string;
  payeeName: string;
  amountINR: number;
  orderRef: string;
  currency: string;
  upiUri: string;
  qrDataUrl: string;
}

/**
 * Builds standard NPCI-compliant UPI URI
 */
export function buildUpiUri(orderRef: string, amount: number = config.commercial.priceINR): string {
  const params = new URLSearchParams({
    pa: config.commercial.upiId,
    pn: config.commercial.upiPayeeName,
    am: amount.toString(),
    cu: config.commercial.currency,
    tn: `API Section License ${orderRef}`,
  });

  return `upi://pay?${params.toString()}`;
}

/**
 * Generates genuine QR code data URL encoding the NPCI UPI payment link
 */
export async function generateUpiPaymentDetails(orderRef: string): Promise<UpiPaymentDetails> {
  const upiUri = buildUpiUri(orderRef);

  // Generate SVG or PNG Data URL directly from the exact UPI URI
  const qrDataUrl = await QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return {
    upiId: config.commercial.upiId,
    payeeName: config.commercial.upiPayeeName,
    amountINR: config.commercial.priceINR,
    orderRef,
    currency: config.commercial.currency,
    upiUri,
    qrDataUrl,
  };
}
