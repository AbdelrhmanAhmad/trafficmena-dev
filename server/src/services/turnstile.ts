import { z } from 'zod';
import { env } from '../config/env.js';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const turnstileResponseSchema = z.object({
  success: z.boolean(),
  'error-codes': z.array(z.string()).optional(),
  challenge_ts: z.string().optional(),
  hostname: z.string().optional(),
  action: z.string().optional(),
  cdata: z.string().optional(),
});

export type TurnstileVerifyResult = {
  success: boolean;
  errorCodes?: string[];
};

/**
 * Verify a Turnstile token with Cloudflare's API.
 * Returns success: true if the token is valid, false otherwise.
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<TurnstileVerifyResult> {
  if (!env.TURNSTILE_SECRET_KEY) {
    // If Turnstile is not configured, skip validation in development
    if (env.NODE_ENV === 'development') {
      console.warn('[turnstile] TURNSTILE_SECRET_KEY not configured, skipping verification');
      return { success: true };
    }
    return { success: false, errorCodes: ['missing-secret-key'] };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', env.TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      console.error('[turnstile] Cloudflare API error', response.status);
      return { success: false, errorCodes: ['api-error'] };
    }

    const data = await response.json();
    const parsed = turnstileResponseSchema.safeParse(data);

    if (!parsed.success) {
      console.error('[turnstile] Invalid response from Cloudflare', parsed.error);
      return { success: false, errorCodes: ['invalid-response'] };
    }

    if (!parsed.data.success) {
      return {
        success: false,
        errorCodes: parsed.data['error-codes'] ?? ['unknown'],
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[turnstile] Verification failed', error);
    return { success: false, errorCodes: ['network-error'] };
  }
}

/**
 * Check if Turnstile is configured and should be enforced.
 */
export function isTurnstileEnabled(): boolean {
  return Boolean(env.TURNSTILE_SECRET_KEY);
}
