import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { env, isProduction } from './config/env.js';
import { MAX_JSON_PAYLOAD_BYTES } from './config/requestLimits.js';
import { registerApiRoutes } from './routes/api/index.js';
import { registerHealthRoutes } from './routes/health.js';

export function createApp() {
  const app = new Hono();
  const allowedOrigins = env.CORS_ALLOWLIST;
  // CSP is also defined in index.html (meta tag) — browsers intersect both, so keep host lists in sync.
  const connectSources = new Set<string>([
    "'self'",
    'https://next-api.useplunk.com',
    'https://challenges.cloudflare.com',
  ]);
  for (const origin of allowedOrigins) {
    connectSources.add(origin);
  }
  connectSources.add('http://localhost:3001');
  connectSources.add('https://cdn.jsdelivr.net');
  connectSources.add('https://unpkg.com');
  connectSources.add('https://*.useplunk.com');
  connectSources.add('https://www.googletagmanager.com');
  connectSources.add('https://www.google-analytics.com');
  connectSources.add('https://analytics.google.com');
  connectSources.add('https://*.google-analytics.com');
  connectSources.add('https://*.analytics.google.com');
  // Google Ads / GA4 Advertising Features (incl. /ccm/collect beacon on www.google.com)
  connectSources.add('https://www.google.com');
  connectSources.add('https://pagead2.googlesyndication.com');
  connectSources.add('https://www.googleadservices.com');
  // Wildcard covers googleads.g.doubleclick.net, stats.g.doubleclick.net, and other GA4/Ads beacon subdomains
  connectSources.add('https://*.g.doubleclick.net');
  connectSources.add('https://ad.doubleclick.net');
  // Meta Pixel
  connectSources.add('https://www.facebook.com');
  connectSources.add('https://connect.facebook.net');
  // TikTok Pixel
  connectSources.add('https://analytics.tiktok.com');
  connectSources.add('https://analytics-ipv6.tiktokw.us');
  connectSources.add('https://ads.tiktok.com');

  const scriptSrc = [
    "'self'",
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
    'https://challenges.cloudflare.com',
    'https://www.googletagmanager.com',
    'https://tagmanager.google.com',
    // Google Ads
    'https://www.google.com',
    'https://www.googleadservices.com',
    'https://pagead2.googlesyndication.com',
    'https://googleads.g.doubleclick.net',
    // Meta Pixel (fbevents.js + CAPI param builder hosted on Meta's S3 bucket)
    'https://connect.facebook.net',
    'https://capi-automation.s3.us-east-2.amazonaws.com',
    // TikTok Pixel
    'https://analytics.tiktok.com',
    'https://analytics-ipv6.tiktokw.us',
    'https://ads.tiktok.com',
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
          'https://www.googletagmanager.com',
          // TikTok Pixel deep-link schemes (per TikTok official docs)
          'bytedance:',
          'sslocal:',
        ],
        frameAncestors: ["'self'"],
        connectSrc: Array.from(connectSources),
        formAction: ["'self'"],
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

  app.use('*', async (c, next) => {
    const method = c.req.method.toUpperCase();
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      const contentType = c.req.header('content-type')?.toLowerCase() ?? '';
      if (contentType.includes('application/json') || contentType.includes('+json')) {
        const contentLengthHeader = c.req.header('content-length');
        if (contentLengthHeader) {
          const contentLength = Number(contentLengthHeader);
          if (Number.isFinite(contentLength) && contentLength > MAX_JSON_PAYLOAD_BYTES) {
            return c.json(
              {
                error: {
                  code: 'PAYLOAD_TOO_LARGE',
                  message: `JSON payload exceeds ${(MAX_JSON_PAYLOAD_BYTES / 1_000_000).toFixed(1)} MB.`,
                },
              },
              413,
            );
          }
        }
      }
    }
    await next();
  });

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
