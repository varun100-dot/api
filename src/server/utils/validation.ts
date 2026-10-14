import { z } from 'zod';

const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export const customerRegisterSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').max(150),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const customerLoginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createOrderSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  customerEmail: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(150, 'Email cannot exceed 150 characters'),
  domain: z
    .string()
    .trim()
    .transform((val) => val.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '').toLowerCase())
    .refine((val) => domainRegex.test(val) || val === 'localhost', {
      message: 'Please provide a valid website domain name (e.g., example.com or app.example.com)',
    }),
});

export const submitPaymentSchema = z.object({
  orderRef: z
    .string()
    .trim()
    .regex(/^DIG-ORD-\d{8}-[A-F0-9]{6}$/i, 'Invalid order reference format'),
  utrReference: z
    .string()
    .trim()
    .min(6, 'UTR / transaction reference must be at least 6 characters')
    .max(50, 'UTR reference too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'UTR reference should contain letters, numbers, and dashes only'),
});

export const adminLoginSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const rejectPaymentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Rejection reason must be at least 3 characters')
    .max(500, 'Rejection reason cannot exceed 500 characters'),
});

export const renewLicenseSchema = z.object({
  paymentReference: z
    .string()
    .trim()
    .min(4, 'Valid payment reference / UTR is required')
    .max(60, 'Payment reference too long'),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional(),
});

export const verifyLicenseSchema = z.object({
  domain: z.string().trim().min(1, 'Domain is required'),
  licenseKey: z.string().trim().min(1, 'License key is required'),
});
