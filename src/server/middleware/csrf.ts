import { Request, Response, NextFunction } from 'express';
import { generateSecureToken } from '../utils/crypto.js';
import { config } from '../config.js';

export const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const CSRF_HEADER_NAME = 'x-xsrf-token';

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Ensure the CSRF cookie exists
  let token = req.cookies?.[CSRF_COOKIE_NAME];
  if (!token) {
    token = generateSecureToken(24);
    if (!req.cookies) {
      req.cookies = {};
    }
    req.cookies[CSRF_COOKIE_NAME] = token;
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by client script for header inclusion
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }

  // Safe HTTP methods do not require verification
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Verification endpoint for external domain checks is exempt from CSRF
  if (req.path === '/license/verify' || req.originalUrl === '/api/license/verify' || req.path.endsWith('/license/verify')) {
    return next();
  }

  // Verify CSRF token from header or request body against cookie
  const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers['x-csrf-token'];
  const bodyToken = req.body?._csrf;
  const providedToken = headerToken || bodyToken;

  if (!providedToken || !token || providedToken !== token) {
    res.status(403).json({
      error: 'Invalid or missing CSRF token',
      message: 'A valid CSRF token header (x-xsrf-token) is required for state-modifying requests.',
    });
    return;
  }

  next();
}
