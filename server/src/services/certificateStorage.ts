import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

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

export async function uploadCertificatePdfBuffer(
  buffer: Buffer,
  certificateCode: string,
): Promise<string> {
  if (!storageZone || !storageAccessKey) {
    throw new Error(
      'Certificate storage is not configured. Set BUNNY_STORAGE_ZONE and BUNNY_STORAGE_ACCESS_KEY.',
    );
  }

  const safeCode = certificateCode.replace(/[^a-zA-Z0-9-]/g, '');
  const storagePath = `certificates/${new Date().getFullYear()}/${safeCode}-${randomUUID().slice(0, 8)}.pdf`;

  const response = await fetch(`https://storage.bunnycdn.com/${storageZone}/${storagePath}`, {
    method: 'PUT',
    headers: {
      AccessKey: storageAccessKey,
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.byteLength.toString(),
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to upload certificate PDF: ${response.status} ${text}`);
  }

  return buildPublicUrl(storagePath);
}

export async function fetchRemoteFileBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from ${url}: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/** Best-effort delete of a file stored on Bunny by its public URL. */
export async function deleteRemoteFileByUrl(url: string): Promise<void> {
  if (!storageZone || !storageAccessKey || !url) return;

  try {
    const pathname = new URL(url).pathname.replace(/^\//, '');
    if (!pathname) return;

    await fetch(`https://storage.bunnycdn.com/${storageZone}/${pathname}`, {
      method: 'DELETE',
      headers: { AccessKey: storageAccessKey },
    });
  } catch (error) {
    console.warn('[certificateStorage] Failed to delete remote file', {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
