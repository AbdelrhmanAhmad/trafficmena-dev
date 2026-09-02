import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

loadEnv({ path: resolve(process.cwd(), 'server/.env') });
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const fixedOtpEnabled = process.env.AUTH_TEST_FIXED_OTP === 'true';
const testEmail = process.env.SESSION_TEST_EMAIL ?? 'abdelrahman.technomasr@gmail.com';

const { auth } = await import('../../server/src/auth.js');
const { createApp } = await import('../../server/src/app.js');

describe('getSessionFromRequest', () => {
  it('resolves session on protected routes after OTP verify (cookie via headers)', async (t) => {
    if (!fixedOtpEnabled) {
      t.skip('Requires AUTH_TEST_FIXED_OTP=true in server/.env');
    }

    const app = createApp();

    await auth.api.sendVerificationOTP({
      body: { email: testEmail, type: 'sign-in' },
    });

    const csrfRes = await app.request('http://localhost/api/settings/public');
    const csrfCookie = csrfRes.headers.get('set-cookie') ?? '';
    const csrfToken = csrfCookie.match(/tm_csrf=([^;]+)/)?.[1] ?? '';

    const verifyRes = await app.request('http://localhost/api/auth/otp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:8080',
        Cookie: csrfCookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ email: testEmail, otp: '000000', intent: 'signin' }),
    });

    assert.equal(verifyRes.status, 200, await verifyRes.text());

    const sessionCookies = verifyRes.headers.getSetCookie?.() ?? [];
    assert.ok(sessionCookies.some((line) => line.startsWith('better-auth.session_token=')));

    const allCookies = [csrfCookie.split(';')[0], ...sessionCookies.map((line) => line.split(';')[0])]
      .filter(Boolean)
      .join('; ');

    const meRes = await app.request('http://localhost/api/users/me?lang=en', {
      headers: { Cookie: allCookies, Origin: 'http://localhost:8080' },
    });

    const meBody = (await meRes.json()) as { user?: { email?: string } };
    assert.equal(meRes.status, 200, JSON.stringify(meBody));
    assert.equal(meBody.user?.email, testEmail);
  });
});
