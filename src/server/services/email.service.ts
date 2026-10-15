import nodemailer from 'nodemailer';
import { config } from '../config.js';

export interface InvoiceEmailData {
  customerName: string;
  customerEmail: string;
  invoiceNumber: string;
  orderRef: string;
  domain: string;
  date: string;
  subtotalINR: number;
  taxAmountINR: number;
  cgstINR: number;
  sgstINR: number;
  totalAmountINR: number;
  licenseKey?: string;
  paymentStatus?: string;
  utrReference?: string | null;
}

/**
 * Creates email transport based on environment variables
 */
function getEmailTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return null;
}

/**
 * Generates an HTML tax invoice email template
 */
export function generateInvoiceHtml(data: InvoiceEmailData): string {
  const formattedDate = new Date(data.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice ${data.invoiceNumber} — API Section</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
    .email-container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .email-header { background: #0f172a; padding: 28px 32px; color: #ffffff; display: flex; justify-content: space-between; align-items: center; }
    .brand-title { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
    .brand-accent { color: #818cf8; }
    .invoice-badge { background: #312e81; color: #c7d2fe; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; }
    .email-body { padding: 32px; }
    .meta-grid { display: table; width: 100%; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
    .meta-col { display: table-cell; width: 50%; vertical-align: top; font-size: 13px; line-height: 1.6; }
    .meta-label { text-transform: uppercase; font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .invoice-table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 24px 0; }
    .invoice-table th { background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-weight: 600; color: #475569; }
    .invoice-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
    .summary-row td { padding: 6px 12px; font-size: 13px; }
    .grand-total td { background: #f8fafc; font-weight: 700; font-size: 15px; color: #4f46e5; border-top: 2px solid #cbd5e1; }
    .license-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 24px 0; }
    .license-key { font-family: monospace; font-size: 16px; font-weight: 700; color: #166534; background: #dcfce7; padding: 6px 10px; border-radius: 4px; display: inline-block; margin-top: 6px; }
    .email-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 11px; color: #64748b; line-height: 1.6; text-align: center; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div>
        <h1 class="brand-title">API <span class="brand-accent">Section</span></h1>
        <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Commercial API Licensing Authority</div>
      </div>
      <div style="text-align: right;">
        <span class="invoice-badge">Tax Invoice (GST)</span>
        <div style="font-size: 13px; font-weight: 700; margin-top: 6px;">${data.invoiceNumber}</div>
        <div style="font-size: 11px; color: #94a3b8;">Date: ${formattedDate}</div>
      </div>
    </div>

    <div class="email-body">
      <p style="font-size: 14px; margin-top: 0;">Dear <strong>${data.customerName}</strong>,</p>
      <p style="font-size: 13px; color: #475569;">
        Thank you for choosing <strong>API Section</strong>. Below is your official commercial tax invoice for the Rich Text Editor API license.
      </p>

      <div class="meta-grid">
        <div class="meta-col">
          <div class="meta-label">Billed To:</div>
          <strong>${data.customerName}</strong><br>
          Authorized Domain: <strong>${data.domain}</strong>
        </div>
        <div class="meta-col" style="text-align: right;">
          <div class="meta-label">Payment Information:</div>
          Mode: <strong>Digital / Online Transfer</strong><br>
          Order Reference: <strong>${data.orderRef}</strong><br>
          Status: <strong style="color: #059669;">${data.paymentStatus || 'Verified & Paid'}</strong>
          ${data.utrReference ? `<br>UTR Ref: <code>${data.utrReference}</code>` : ''}
        </div>
      </div>

      ${
        data.licenseKey
          ? `
      <div class="license-box">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #15803d;">
          ✓ Commercial License Activated (365 Days Left)
        </div>
        <div style="font-size: 12px; color: #166534; margin-top: 4px;">
          This key is authorized for production deployment on: <strong>${data.domain}</strong>
        </div>
        <div class="license-key">${data.licenseKey}</div>
      </div>
      `
          : ''
      }

      <table class="invoice-table">
        <thead>
          <tr>
            <th>Description & SAC</th>
            <th style="text-align: center;">SAC</th>
            <th style="text-align: right;">Base Price</th>
            <th style="text-align: right;">Tax (18% GST)</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>API Section Rich Text Editor API</strong><br>
              <span style="font-size: 11px; color: #64748b;">1-Year Commercial License (${data.domain})</span>
            </td>
            <td style="text-align: center; color: #64748b;">997331</td>
            <td style="text-align: right;">₹${data.subtotalINR.toFixed(2)}</td>
            <td style="text-align: right;">₹${data.taxAmountINR.toFixed(2)}</td>
            <td style="text-align: right; font-weight: 600;">₹${data.totalAmountINR.toFixed(2)}</td>
          </tr>
          <tr class="summary-row">
            <td colspan="4" style="text-align: right; color: #64748b;">Taxable Subtotal (Net Amount):</td>
            <td style="text-align: right; font-weight: 600;">₹${data.subtotalINR.toFixed(2)}</td>
          </tr>
          <tr class="summary-row">
            <td colspan="4" style="text-align: right; color: #64748b;">Central GST (CGST @ 9%):</td>
            <td style="text-align: right;">₹${data.cgstINR.toFixed(2)}</td>
          </tr>
          <tr class="summary-row">
            <td colspan="4" style="text-align: right; color: #64748b;">State GST (SGST @ 9%):</td>
            <td style="text-align: right;">₹${data.sgstINR.toFixed(2)}</td>
          </tr>
          <tr class="grand-total">
            <td colspan="4" style="text-align: right;">Grand Total Paid (INR):</td>
            <td style="text-align: right;">₹${data.totalAmountINR.toFixed(2)} INR</td>
          </tr>
        </tbody>
      </table>

      <div style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 16px;">
        <strong>Terms of Supply:</strong> License is non-transferable and valid for 365 calendar days strictly on the authorized domain (${data.domain}).
      </div>
    </div>

    <div class="email-footer">
      This is a computer-generated digital tax invoice issued by <strong>API Section</strong> (SAC 997331). No physical signature is required.<br>
      © ${new Date().getFullYear()} API Section. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dispatches the official tax invoice to the customer email address
 */
export async function sendInvoiceEmail(data: InvoiceEmailData): Promise<{
  success: boolean;
  messageId?: string;
  simulated?: boolean;
}> {
  const transporter = getEmailTransport();
  const htmlContent = generateInvoiceHtml(data);
  const fromAddress = process.env.SMTP_FROM || `"API Section Billing" <${config.commercial.supportEmail}>`;

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: data.customerEmail,
        subject: `[API Section] Tax Invoice ${data.invoiceNumber} — ${data.domain}`,
        html: htmlContent,
      });

      console.log(`[Email Service] Invoice sent via SMTP to ${data.customerEmail} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, simulated: false };
    } catch (err) {
      console.error(`[Email Service] SMTP dispatch error:`, err);
      // Fallback to simulated delivery log if SMTP transport fails
    }
  }

  // Simulated / Development / Zero-Config fallback:
  console.log(`=======================================================`);
  console.log(` [EMAIL DISPATCH SIMULATION] Tax Invoice Sent!          `);
  console.log(` To:      ${data.customerEmail} (${data.customerName})  `);
  console.log(` Subject: [API Section] Tax Invoice ${data.invoiceNumber}`);
  console.log(` Domain:  ${data.domain}                                `);
  console.log(` Amount:  ₹${data.totalAmountINR} INR (Incl 18% GST)    `);
  console.log(` Notice:  Configure SMTP_HOST in .env for live dispatch `);
  console.log(`=======================================================`);

  return { success: true, simulated: true };
}
