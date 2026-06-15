import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { Context, Hono } from 'hono';
import { env } from '../../config/env.js';
import { requireManager } from './utils.js';

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB cap for MVP

type UploadScope = 'events' | 'library' | 'editor' | 'general' | 'digital-products' | 'masterclasses';

type ScopeConfig = {
  directory: string;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
};

const scopeConfig: Record<UploadScope, ScopeConfig> = {
  events: {
    directory: 'events',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
  },
  library: {
    directory: 'library',
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ],
    allowedExtensions: ['pdf', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'webp', 'avif'],
  },
  editor: {
    directory: 'editor',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
  },
  general: {
    directory: 'assets',
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ],
    allowedExtensions: ['pdf', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'webp', 'avif'],
  },
  'digital-products': {
    directory: 'digital-products',
    allowedMimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/markdown',
      'text/html',
      'text/csv',
    ],
    allowedExtensions: ['xls', 'xlsx', 'ppt', 'pptx', 'md', 'markdown', 'html', 'htm', 'txt', 'csv'],
  },
  masterclasses: {
    directory: 'masterclasses',
    allowedMimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/markdown',
      'text/html',
      'text/csv',
    ],
    allowedExtensions: ['xls', 'xlsx', 'ppt', 'pptx', 'md', 'markdown', 'html', 'htm', 'txt', 'csv'],
  },
};

const storageZone = env.BUNNY_STORAGE_ZONE;
const storageAccessKey = env.BUNNY_STORAGE_ACCESS_KEY;

const FILE_SIGNATURES: Record<string, number[][]> = {
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  png: [[0x89, 0x50, 0x4e, 0x47]],
  pdf: [[0x25, 0x50, 0x44, 0x46]],
  webp: [[0x52, 0x49, 0x46, 0x46]],
};

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

function resolveScopeName(input: unknown): UploadScope {
  if (!input || typeof input !== 'string') return 'events';
  const lowered = input.toLowerCase();
  if (lowered in scopeConfig) {
    return lowered as UploadScope;
  }
  return 'general';
}

function getExtension(file: File, fallback = 'bin') {
  if (file.name?.includes('.')) {
    return path.extname(file.name).slice(1);
  }
  if (file.type?.includes('/')) {
    return file.type.split('/')[1];
  }
  return fallback;
}

async function validateFileSignature(file: File, extension: string) {
  const expectedSignatures = FILE_SIGNATURES[extension];
  if (!expectedSignatures || expectedSignatures.length === 0) {
    return true;
  }

  const arrayBuffer = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  return expectedSignatures.some((signature) =>
    signature.every((value, index) => bytes[index] === value),
  );
}

async function handleUploadRequest(c: Context) {




  const staff = await requireManager(c);
  if ('response' in staff) return staff.response;

  if (!storageZone || !storageAccessKey) {
    return c.json(
      {
        error: {
          code: 'UPLOAD_DISABLED',
          message: 'Uploads are not configured. Set BUNNY_STORAGE_* environment variables.',
        },
      },
      503,
    );
  }

  const zone = storageZone;
  const accessKey = storageAccessKey;

  const body = await c.req.parseBody();
  const scope = resolveScopeName(body.scope ?? c.req.query('scope'));
  const config = scopeConfig[scope];

  const maybeFile = body.file ?? body.image ?? body.asset;
  const file = Array.isArray(maybeFile) ? maybeFile[0] : maybeFile;

  if (!(file instanceof File)) {
    return c.json(
      {
        error: {
          code: 'INVALID_REQUEST',
          message: 'Upload a valid file.',
        },
      },
      400,
    );
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return c.json(
      {
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'Files must be 20 MB or smaller.',
        },
      },
      413,
    );
  }

  const extension = getExtension(file)
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

  if (!config.allowedExtensions.includes(extension)) {
    return c.json(
      {
        error: {
          code: 'UNSUPPORTED_EXTENSION',
          message: `.${extension || 'unknown'} files are not allowed for this upload type.`,
        },
      },
      415,
    );
  }

  if (file.type && !config.allowedMimeTypes.includes(file.type)) {
    return c.json(
      {
        error: {
          code: 'UNSUPPORTED_TYPE',
          message: `${file.type} is not permitted for this upload type.`,
        },
      },
      415,
    );
  }

  const signatureValid = await validateFileSignature(file, extension);
  if (!signatureValid) {
    return c.json(
      {
        error: {
          code: 'SIGNATURE_MISMATCH',
          message: 'File contents do not match the declared file type.',
        },
      },
      415,
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const storagePath = `${config.directory}/${new Date().getFullYear()}/${randomUUID()}.${
    extension || 'bin'
  }`;

  const response = await fetch(`https://storage.bunnycdn.com/${zone}/${storagePath}`, {
    method: 'PUT',
    headers: {
      AccessKey: accessKey,
      'Content-Type': file.type || 'application/octet-stream',
      'Content-Length': buffer.byteLength.toString(),
    },
    body: buffer,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    console.error('[uploads] BunnyCDN upload failed', {
      status: response.status,
      scope,
      error: text,
    });

    if (response.status === 401) {
      return c.json(
        {
          error: {
            code: 'UPLOAD_UNAUTHORIZED',
            message:
              'Bunny storage rejected the upload (401). Check BUNNY_STORAGE_ZONE and BUNNY_STORAGE_ACCESS_KEY in server/.env — use the Storage Zone password, not the read-only key.',
          },
        },
        502,
      );
    }

    return c.json(
      {
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Unable to upload file to storage. Try again later.',
        },
      },
      502,
    );
  }

  return c.json({
    url: buildPublicUrl(storagePath),
    path: storagePath,
    sizeBytes: file.size,
    contentType: file.type || 'application/octet-stream',
    scope,
  });
}

export function registerUploadRoutes(app: Hono) {
  app.post('/uploads', (c) => handleUploadRequest(c));
  app.post('/uploads/image', (c) => handleUploadRequest(c));
}
