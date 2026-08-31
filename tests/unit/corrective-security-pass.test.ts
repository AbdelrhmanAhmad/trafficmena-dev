import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { buildOtpVerificationIdentifier } from '../../server/src/auth/otpIdentifier.ts';
import {
  getActivationBlockReason,
  isInvitationExpired,
} from '../../server/src/services/invitationLifecycle.ts';
import { resolveClientIp } from '../../server/src/utils/requestIp.ts';

describe('TM-003 invitation lifecycle semantics', () => {
  const base = {
    status: 'accepted',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    acceptedAt: new Date('2026-01-01T00:00:00Z'),
    activatedAt: null,
  };

  it('rejects expired invitations', () => {
    assert.equal(
      isInvitationExpired({ ...base, status: 'expired', expiresAt: new Date('2020-01-01') }),
      true,
    );
    assert.equal(getActivationBlockReason({ ...base, expiresAt: new Date('2020-01-01') }), 'expired');
  });

  it('rejects activation when already activated', () => {
    assert.equal(
      getActivationBlockReason({ ...base, activatedAt: new Date('2026-02-01') }),
      'already_activated',
    );
  });

  it('rejects activation before acceptance', () => {
    assert.equal(
      getActivationBlockReason({ ...base, acceptedAt: null, status: 'sent' }),
      'not_accepted',
    );
  });

  it('uses atomic activation update conditions in route handler', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/invitations.ts', import.meta.url),
      'utf8',
    );
    assert.match(source, /isNull\(invitations\.activatedAt\)/);
    assert.match(source, /INVITATION_ALREADY_ACTIVATED/);
    assert.match(source, /isNull\(invitations\.acceptedAt\)/);
  });
});

describe('TM-008 trusted client IP resolution', () => {
  it('ignores spoofed X-Forwarded-For when TRUST_PROXY is false', () => {
    assert.equal(
      resolveClientIp({
        trustProxy: false,
        forwardedFor: '203.0.113.50',
        socketAddress: '198.51.100.10',
      }),
      '198.51.100.10',
    );
  });

  it('honors X-Forwarded-For first hop when TRUST_PROXY is true', () => {
    assert.equal(
      resolveClientIp({
        trustProxy: true,
        forwardedFor: '203.0.113.50, 10.0.0.1',
        socketAddress: '198.51.100.10',
      }),
      '203.0.113.50',
    );
  });

  it('prefers CF-Connecting-IP when TRUST_PROXY is true', () => {
    assert.equal(
      resolveClientIp({
        trustProxy: true,
        cfConnectingIp: '203.0.113.99',
        forwardedFor: '203.0.113.50',
        socketAddress: '198.51.100.10',
      }),
      '203.0.113.99',
    );
  });
});

describe('TM-008 Better Auth OTP identifier alignment', () => {
  it('matches Better Auth email-otp identifier format', () => {
    assert.equal(
      buildOtpVerificationIdentifier('sign-in', 'user@example.com'),
      'sign-in-otp-user@example.com',
    );
  });

  it('queries auth_verifications with prefixed identifier', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/auth.ts', import.meta.url),
      'utf8',
    );
    assert.match(source, /buildOtpVerificationIdentifier/);
    assert.doesNotMatch(source, /eq\(authVerifications\.identifier, email\)/);
  });
});

describe('TM-017 database health error sanitization', () => {
  it('does not return raw PostgreSQL errors from /db/health', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/health.ts', import.meta.url),
      'utf8',
    );
    assert.match(source, /database_unavailable/);
    assert.doesNotMatch(source, /\(error as Error\)\.message/);
  });
});

describe('TM-018 canonical HTTPS redirect', () => {
  it('redirects using configured canonical origin instead of Host header', async () => {
    const source = await readFile(
      new URL('../../server/src/app.ts', import.meta.url),
      'utf8',
    );
    assert.match(source, /canonicalOrigin/);
    assert.match(source, /env\.API_BASE_URL/);
    assert.doesNotMatch(source, /https:\/\/\$\{host\}/);
  });
});

describe('TM-026 fetchJson header merge ordering', () => {
  it('merges caller headers before CSRF and prevents init.headers override', async () => {
    const source = await readFile(
      new URL('../../src/app/api/client.ts', import.meta.url),
      'utf8',
    );
    assert.match(source, /_ignoredHeaders/);
    assert.match(source, /credentials: restInit\.credentials/);
    assert.match(source, /Object\.assign\(headers, getCsrfHeaders\(\)\)/);
  });
});

describe('TM-016 library iframe sandbox', () => {
  it('applies sandbox on legacy VideoEmbed iframes', async () => {
    const source = await readFile(
      new URL('../../src/shared/components/VideoEmbed.tsx', import.meta.url),
      'utf8',
    );
    assert.match(source, /LEGACY_IFRAME_SANDBOX/);
    assert.match(source, /sandbox=\{LEGACY_IFRAME_SANDBOX\}/);
  });
});

describe('TM-025 reservation TTL refresh', () => {
  it('requires explicit force-new to replace pending checkout holds', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/payments.ts', import.meta.url),
      'utf8',
    );
    assert.match(source, /forceNewCode/);
    assert.match(source, /PENDING_PAYMENT/);
    assert.match(source, /RESERVATION_TTL_MS/);
  });
});
