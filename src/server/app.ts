import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';
import { getDatabase } from './db/index.js';
import { csrfProtection } from './middleware/csrf.js';
import { apiRateLimiter } from './middleware/rate-limiter.js';
import { apiRouter } from './routes/api.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { customerRouter } from './routes/customer.routes.js';

export function createApp(customDb?: DatabaseSync): express.Express {
  const app = express();
  const db = customDb || getDatabase();

  // Attach database connection to all requests
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.db = db;
    next();
  });

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS for development Vite server
  app.use(
    cors({
      origin: config.isProduction ? false : ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );

  // Parsers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser(config.sessionSecret));

  // Rate limiting on API routes
  app.use('/api', apiRateLimiter);

  // CSRF protection on API routes
  app.use('/api', csrfProtection);

  // Mount API routers
  app.use('/api', apiRouter);
  app.use('/api/customer', customerRouter);
  app.use('/api/admin', adminRouter);

  // In production, serve the built frontend assets
  const clientDistPath = path.resolve(process.cwd(), 'dist/public');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));

    // Fallback for Single Page Application routing
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.resolve(clientDistPath, 'index.html'));
    });
  }

  // 404 handler for API routes
  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Global Error Handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(500).json({
      error: 'Internal Server Error',
      message: config.isProduction ? 'An unexpected error occurred.' : message,
    });
  });

  return app;
}
