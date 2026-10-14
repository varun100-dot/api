import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.pdf']);
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = crypto.randomBytes(16).toString('hex');
    cb(null, `${safeBase}${ext}`);
  },
});

export const paymentProofUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error('Invalid file type. Allowed formats: PNG, JPG, JPEG, WEBP, PDF.'));
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Invalid file MIME type.'));
    }
    cb(null, true);
  },
});
