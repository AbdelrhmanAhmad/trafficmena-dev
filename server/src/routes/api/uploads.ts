import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { Hono } from 'hono';
import { env } from '../../config/env.js';
import { requireAdmin } from './utils.js';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

const storageZone = env.BUNNY_STORAGE_ZONE;
const storageAccessKey = env.BUNNY_STORAGE_ACCESS_KEY;

function buildPublicUrl(storagePath: string) {
  if (env.BUNNY_STORAGE_CDN_URL) {
    return `${env.BUNNY_STORAGE_CDN_URL}/${storagePath}`
      .replace(/(?<!:)\/{2,}/g, '/')
      .replace(':/', '://');
  }
  if (!storageZone) {
    return storagePath;
  }
  return `https://${storageZone}.b-cdn.net/${storagePath}`;
}

export function registerUploadRoutes(app: Hono) {
  app.post('/uploads/image', async (c) => {
    const admin = await requireAdmin(c);
    if ('response' in admin) return admin.response;

    if (!storageZone || !storageAccessKey) {
      return c.json(
        {
          error: {
            code: 'UPLOAD_DISABLED',
            message: 'Image uploads are not configured. Set BUNNY_STORAGE_* environment variables.',
          },
        },
        503,
      );
    }

    const body = await c.req.parseBody();
    const maybeFile = body.file ?? body.image ?? body.asset;

    const file = Array.isArray(maybeFile) ? maybeFile[0] : maybeFile;

    if (!(file instanceof File)) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Upload a valid image file.',
          },
        },
        400,
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return c.json(
        {
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'Images must be smaller than 5 MB.',
          },
        },
        413,
      );
    }

    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return c.json(
        {
          error: {
            code: 'UNSUPPORTED_TYPE',
            message: 'Only JPEG, PNG, WebP, or AVIF images are allowed.',
          },
        },
        415,
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extension = file.name?.includes('.')
      ? path.extname(file.name).slice(1)
      : (file.type?.split('/')[1] ?? 'jpg');
    const safeExtension = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
    const storagePath = `events/${new Date().getFullYear()}/${randomUUID()}.${safeExtension}`;

    const response = await fetch(`https://storage.bunnycdn.com/${storageZone}/${storagePath}`, {
      method: 'PUT',
      headers: {
        AccessKey: storageAccessKey,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: buffer,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      console.error('[uploads:image] BunnyCDN upload failed', response.status, text);
      return c.json(
        {
          error: {
            code: 'UPLOAD_FAILED',
            message: 'Unable to upload image to storage. Try again later.',
          },
        },
        502,
      );
    }

    return c.json({
      url: buildPublicUrl(storagePath),
      path: storagePath,
    });
  });
}
