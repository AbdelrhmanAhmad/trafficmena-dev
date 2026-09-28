import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { env } from '../../../config/env.js';

const MAX_FRAME_BYTES = 8 * 1024 * 1024;

function buildPublicUrl(storagePath: string) {
  if (env.BUNNY_STORAGE_CDN_URL) {
    return `${env.BUNNY_STORAGE_CDN_URL}/${storagePath}`
      .replace(/(?<!:)\/{2,}/g, '/')
      .replace(':/', '://');
  }
  const zone = env.BUNNY_STORAGE_ZONE;
  if (!zone) return storagePath;
  return `https://${zone}.b-cdn.net/${storagePath}`;
}

/**
 * Upload a composited attendee-frame PNG/JPEG to Bunny (ecd/frames/…).
 * Used by public ECD checkout confirmation + portal (not hub /api/uploads).
 */
export async function uploadEcdAttendeeFrameBuffer(params: {
  buffer: Buffer;
  contentType: string;
  extension: string;
}): Promise<{ url: string; path: string }> {
  const zone = env.BUNNY_STORAGE_ZONE;
  const accessKey = env.BUNNY_STORAGE_ACCESS_KEY;
  if (!zone || !accessKey) {
    throw Object.assign(new Error('Uploads are not configured.'), { code: 'UPLOAD_DISABLED' });
  }
  if (params.buffer.byteLength > MAX_FRAME_BYTES) {
    throw Object.assign(new Error('Image must be 8 MB or smaller.'), { code: 'FILE_TOO_LARGE' });
  }

  const ext = (params.extension || 'png').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
  if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    throw Object.assign(new Error('Only PNG, JPEG, or WebP frames are allowed.'), {
      code: 'UNSUPPORTED_TYPE',
    });
  }

  const storagePath = `ecd/frames/${new Date().getFullYear()}/${randomUUID()}.${ext}`;
  const response = await fetch(`https://storage.bunnycdn.com/${zone}/${storagePath}`, {
    method: 'PUT',
    headers: {
      AccessKey: accessKey,
      'Content-Type': params.contentType || 'image/png',
      'Content-Length': params.buffer.byteLength.toString(),
    },
    body: new Uint8Array(params.buffer),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    console.error('[ecd] attendee frame upload failed', { status: response.status, error: text });
    throw Object.assign(new Error('Unable to upload frame image.'), { code: 'UPLOAD_FAILED' });
  }

  return { url: buildPublicUrl(storagePath), path: storagePath };
}

export function parseDataUrlImage(dataUrl: string): { buffer: Buffer; contentType: string; extension: string } | null {
  const match = /^data:(image\/(png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(
    String(dataUrl || '').trim(),
  );
  if (!match) return null;
  const contentType = match[1].toLowerCase();
  const extension = match[2].toLowerCase() === 'jpg' ? 'jpg' : match[2].toLowerCase();
  try {
    return {
      buffer: Buffer.from(match[3], 'base64'),
      contentType,
      extension: extension === 'jpeg' ? 'jpg' : extension,
    };
  } catch {
    return null;
  }
}
