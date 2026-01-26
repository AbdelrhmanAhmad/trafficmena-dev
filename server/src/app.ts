import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { env, isProduction } from './config/env.js';
import { registerApiRoutes } from './routes/api/index.js';
import { registerHealthRoutes } from './routes/health.js';

export function createApp() {
  const app = new Hono();
  const allowedOrigins = env.CORS_ALLOWLIST;
  const connectSources = new Set<string>([
    "'self'",
    'https://api.useplunk.com',
    'https://challenges.cloudflare.com',
  ]);
  for (const origin of allowedOrigins) {
    connectSources.add(origin);
  }
  connectSources.add('http://localhost:3001');
  connectSources.add('https://cdn.jsdelivr.net');
  connectSources.add('https://unpkg.com');
  connectSources.add('https://*.useplunk.com');

  const scriptSrc = [
    "'self'",
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
    'https://challenges.cloudflare.com',
  ];

  if (!isProduction) {
    scriptSrc.push("'unsafe-eval'");
  }

  if (isProduction) {
    const issuer = env.BETTER_AUTH_ISSUER ?? '';
    if (!issuer || !issuer.startsWith('https://')) {
      throw new Error('BETTER_AUTH_ISSUER must be configured with an HTTPS URL in production.');
    }
  }

  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc,
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdn.jsdelivr.net',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        mediaSrc: ["'self'", 'blob:', 'https:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameSrc: [
          "'self'",
          'https://challenges.cloudflare.com',
          'https://www.youtube.com',
          'https://www.youtube-nocookie.com',
          'https://player.vimeo.com',
          'https://vimeo.com',
          'https://docs.google.com',
          'https://drive.google.com',
          'https://canva.com',
          'https://*.canva.com',
          'https://gamma.app',
          'https://*.gamma.app',
          'https://bunnycdn.com',
          'https://*.bunnycdn.com',
          'https://iframe.videodelivery.net',
          'https://iframe.mediadelivery.net',
          'https://*.mediadelivery.net',
          'https://video.bunnycdn.com',
          'https://stream.bunnycdn.com',
        ],
        frameAncestors: ["'self'"],
        connectSrc: Array.from(connectSources),
        formAction: ["'self'", 'https://supabase.com'],
      },
      xFrameOptions: 'DENY',
      referrerPolicy: 'strict-origin-when-cross-origin',
      // permissionsPolicy: 'camera=(), microphone=(), geolocation=()',
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
      },
      crossOriginOpenerPolicy: 'same-origin',
      crossOriginResourcePolicy: 'same-origin',
      removePoweredBy: true,
    }),
  );

  app.use(
    '*',
    cors({
      origin: (requestOrigin) => {
        if (!requestOrigin) {
          return allowedOrigins[0] ?? null;
        }

        return allowedOrigins.includes(requestOrigin) ? requestOrigin : null;
      },
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
      credentials: true,
      exposeHeaders: ['X-Request-Id'],
      maxAge: 60,
    }),
  );

  app.use('*', logger());
  app.use('*', timing());
  app.use('*', async (c, next) => {
    if (isProduction) {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      const forwardedProto = c.req.header('x-forwarded-proto');
      if (forwardedProto && forwardedProto !== 'https') {
        const host = c.req.header('host');
        if (host) {
          const requestUrl = new URL(c.req.url, `http://${host}`);
          return c.redirect(`https://${host}${requestUrl.pathname}${requestUrl.search}`, 301);
        }
      }
    }
    await next();
    c.res.headers.delete('Server');
    c.res.headers.delete('X-Powered-By');
  });

  app.onError((err, c) => {
    console.error('[hono] unhandled error', err);
    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong. Please try again later.',
        },
        data: null,
      },
      500,
    );
  });

  registerHealthRoutes(app);
  registerApiRoutes(app);

  return app;
}
