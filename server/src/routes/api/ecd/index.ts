import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from '../../../config/env.js';
import { registerEcdAdminRoutes } from './admin.js';
import { registerEcdAdminContentRoutes } from './adminContent.js';
import { registerEcdBookingRoutes } from './bookings.js';
import { registerEcdContentRoutes } from './content.js';
import { ecdOriginGuard, isEcdEnabled } from './helpers.js';
import { registerEcdPaymentRoutes } from './payments.js';
import { registerEcdSessionRoutes } from './session.js';

/**
 * Removable ECommerce Day 2026 HTML checkout API.
 * Mounted at `/api/ecd` outside the main CSRF-wrapped `/api` router.
 */
export function createEcdApp() {
  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: (origin) => {
        const allow = [...env.ECD_CORS_ALLOWLIST, ...env.CORS_ALLOWLIST];
        // Reflect request origin when allowed (required for credentialed/cross-origin fetch).
        if (!origin) {
          // No Origin header (same-origin proxy / curl) — echo a safe default.
          return allow[0] || 'http://localhost:5500';
        }
        if (allow.includes(origin) || (origin === 'null' && allow.includes('null'))) {
          return origin;
        }
        // Dev: any localhost / 127.0.0.1 port
        if (env.NODE_ENV !== 'production') {
          try {
            const url = new URL(origin);
            if (
              (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
              (url.protocol === 'http:' || url.protocol === 'https:')
            ) {
              return origin;
            }
          } catch {
            // ignore
          }
        }
        return '';
      },
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
      // Admin calls send session cookies; HTML checkout uses Bearer + credentials:omit.
      credentials: true,
      maxAge: 600,
    }),
  );

  app.use('*', async (c, next) => {
    if (!isEcdEnabled()) {
      return c.json(
        { error: { code: 'ECD_DISABLED', message: 'ECD checkout module is disabled.' } },
        503,
      );
    }
    return next();
  });

  app.use('*', ecdOriginGuard);

  app.get('/health', (c) => c.json({ data: { ok: true, module: 'ecd' } }));

  registerEcdContentRoutes(app);
  registerEcdSessionRoutes(app);
  registerEcdPaymentRoutes(app);
  registerEcdBookingRoutes(app);
  registerEcdAdminRoutes(app);
  registerEcdAdminContentRoutes(app);

  return app;
}
