import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import { createOrder, getOrderByRef, submitPaymentVerification } from '../services/order.service.js';
import { getLicenseByOrderRef, verifyDomainLicense } from '../services/license.service.js';
import { createOrderSchema, submitPaymentSchema, verifyLicenseSchema } from '../utils/validation.js';
import { generateUpiPaymentDetails } from '../utils/upi.js';
import { paymentProofUpload } from '../middleware/upload.js';
import { orderRateLimiter } from '../middleware/rate-limiter.js';
import { CSRF_COOKIE_NAME } from '../middleware/csrf.js';

export const apiRouter = Router();

/**
 * Public commercial config & product terms
 */
apiRouter.get('/config', (_req: Request, res: Response) => {
  res.json({
    brandName: config.commercial.brandName,
    productName: config.commercial.productName,
    priceINR: config.commercial.priceINR,
    currency: config.commercial.currency,
    billingPeriod: config.commercial.billingPeriod,
    licenseScope: config.commercial.licenseScope,
    renewalTerms: config.commercial.renewalTerms,
    paymentMethod: config.commercial.paymentMethod,
    upiId: config.commercial.upiId,
    upiPayeeName: config.commercial.upiPayeeName,
    activationTerms: config.commercial.activationTerms,
    supportEmail: config.commercial.supportEmail,
  });
});

/**
 * CSRF token endpoint
 */
apiRouter.get('/csrf-token', (req: Request, res: Response) => {
  const token = req.cookies?.[CSRF_COOKIE_NAME];
  res.json({ csrfToken: token || null });
});

/**
 * Create a new pending order
 */
apiRouter.post('/orders', orderRateLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = createOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const db: DatabaseSync = req.db!;
    const ipAddress = req.ip || req.socket.remoteAddress;

    const order = createOrder(db, {
      customerName: parseResult.data.customerName,
      customerEmail: parseResult.data.customerEmail,
      domain: parseResult.data.domain,
      ipAddress,
    });

    const paymentDetails = await generateUpiPaymentDetails(order.order_ref);

    res.status(201).json({
      success: true,
      order: {
        orderRef: order.order_ref,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        domain: order.domain,
        amountINR: order.amount_inr,
        currency: order.currency,
        status: order.status,
        createdAt: order.created_at,
      },
      payment: paymentDetails,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create order';
    res.status(500).json({ error: 'Order creation failed', message });
  }
});

/**
 * Lookup order status by reference
 */
apiRouter.get('/orders/:orderRef', async (req: Request, res: Response) => {
  try {
    const { orderRef } = req.params;
    const db: DatabaseSync = req.db!;

    const order = getOrderByRef(db, orderRef);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const paymentDetails = await generateUpiPaymentDetails(order.order_ref);
    const license = order.status === 'payment_approved' ? getLicenseByOrderRef(db, order.order_ref) : null;

    res.json({
      orderRef: order.order_ref,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      domain: order.domain,
      amountINR: order.amount_inr,
      currency: order.currency,
      status: order.status,
      utrReference: order.utr_reference,
      submittedAt: order.submitted_at,
      reviewedAt: order.reviewed_at,
      rejectionReason: order.rejection_reason,
      createdAt: order.created_at,
      payment: paymentDetails,
      license: license
        ? {
            licenseKey: license.license_key,
            domain: license.domain,
            status: license.status,
            activatedAt: license.activated_at,
            expiresAt: license.expires_at,
          }
        : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve order';
    res.status(500).json({ error: 'Lookup failed', message });
  }
});

/**
 * Customer submits payment reference / proof for manual verification
 */
apiRouter.post(
  '/orders/:orderRef/payment',
  orderRateLimiter,
  paymentProofUpload.single('proofFile'),
  async (req: Request, res: Response) => {
    try {
      const { orderRef } = req.params;
      const parseResult = submitPaymentSchema.safeParse({
        orderRef,
        utrReference: req.body.utrReference,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const db: DatabaseSync = req.db!;
      const ipAddress = req.ip || req.socket.remoteAddress;

      const fileData = req.file
        ? {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : undefined;

      const updatedOrder = submitPaymentVerification(db, {
        orderRef,
        utrReference: parseResult.data.utrReference,
        file: fileData,
        ipAddress,
      });

      res.json({
        success: true,
        message: 'Payment verification submitted. Status is now pending manual verification by API Section administrators.',
        order: {
          orderRef: updatedOrder.order_ref,
          status: updatedOrder.status,
          utrReference: updatedOrder.utr_reference,
          submittedAt: updatedOrder.submitted_at,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment submission failed';
      res.status(400).json({ error: 'Submission rejected', message });
    }
  }
);

/**
 * Public domain license verification API (Sales portal registry check)
 */
apiRouter.post('/license/verify', (req: Request, res: Response) => {
  try {
    const parseResult = verifyLicenseSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        valid: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const db: DatabaseSync = req.db!;
    const result = verifyDomainLicense(db, parseResult.data.domain, parseResult.data.licenseKey);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    res.status(500).json({ valid: false, error: 'Verification failed', message });
  }
});
