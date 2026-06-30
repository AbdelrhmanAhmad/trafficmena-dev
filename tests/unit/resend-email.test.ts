import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// email.ts -> config/env.ts parses process.env at import time, so set the required vars first.
// RESEND_API_KEY must start with "re_" or sendXxxEmail short-circuits into the simulate path.
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';
process.env.RESEND_API_KEY = 're_test_key_for_unit_tests';

const { sendOtpEmail, sendInvitationEmail, sendEmailChangeNotice } = await import(
  '../../server/src/services/email.ts'
);
const { env } = await import('../../server/src/config/env.ts');
const { mapEmailDeliveryReason } = await import('../../server/src/services/invitations.ts');

const EMAILS_URL = 'https://api.resend.com/emails';
const CONTACTS_URL = 'https://api.resend.com/contacts';

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

// Swap global fetch (the resend SDK calls it under the hood) for a capturing stub. `handler`
// may return a Response to override the default 200; returning null uses the default success.
const installFetch = (handler) => {
  const realFetch = globalThis.fetch;
  const calls = [];
  let counter = 0;
  globalThis.fetch = async (url, init = {}) => {
    const call = {
      url: String(url),
      method: (init.method || 'GET').toUpperCase(),
      body: init.body ? JSON.parse(init.body) : null,
    };
    calls.push(call);
    return handler?.(call) ?? jsonResponse(200, { id: `res_${++counter}` });
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = realFetch;
    },
  };
};

// The contact upsert is fired off the critical path (never awaited), so let pending microtasks +
// the stubbed fetch chain settle before asserting on / restoring it.
const flush = () => new Promise((resolve) => setTimeout(resolve, 15));

describe('Resend transactional sends', () => {
  it('sendOtpEmail posts to /emails with the TrafficMENA sender, recipient, and body', async () => {
    const { calls, restore } = installFetch();
    try {
      await sendOtpEmail({ email: 'signup@example.com', otp: '123456', ttlMinutes: 10 });
      await flush();
    } finally {
      restore();
    }
    const send = calls.find((c) => c.url === EMAILS_URL);
    assert.ok(send, 'expected a POST to the Resend /emails endpoint');
    assert.equal(send.method, 'POST');
    assert.match(send.body.from, /^TrafficMENA <[^>]+@updates\.trafficmena\.com>$/);
    assert.equal(send.body.to, 'signup@example.com');
    assert.match(send.body.subject, /verification code/i);
    assert.ok(send.body.html?.length > 0 && send.body.text?.length > 0, 'expected html + text');
  });

  // Marketing-list continuity (Plunk parity): every successful send re-subscribes the recipient.
  const senders = [
    {
      name: 'sendOtpEmail',
      recipient: 'signup@example.com',
      run: () => sendOtpEmail({ email: 'signup@example.com', otp: '123456', ttlMinutes: 10 }),
    },
    {
      name: 'sendInvitationEmail',
      recipient: 'invitee@example.com',
      run: () =>
        sendInvitationEmail({
          email: 'invitee@example.com',
          invitationLink: 'https://app.trafficmena.com/invite/abc',
          expiresAt: new Date(Date.now() + 86_400_000),
        }),
    },
    {
      name: 'sendEmailChangeNotice',
      recipient: 'old@example.com',
      run: () =>
        sendEmailChangeNotice({
          email: 'old@example.com',
          status: 'requested',
          maskedNewEmail: 'n***@example.com',
        }),
    },
  ];

  for (const { name, recipient, run } of senders) {
    it(`${name} re-subscribes the contact: update unsubscribed:false, create fallback`, async () => {
      // contacts.update (PATCH by email) reports the contact isn't found -> fall back to create.
      const handler = (call) =>
        call.method === 'PATCH' && call.url.startsWith(`${CONTACTS_URL}/`)
          ? jsonResponse(404, { name: 'not_found', message: 'Contact not found', statusCode: 404 })
          : null;
      const { calls, restore } = installFetch(handler);
      try {
        await run();
        await flush();
      } finally {
        restore();
      }
      const update = calls.find(
        (c) => c.method === 'PATCH' && c.url.startsWith(`${CONTACTS_URL}/`),
      );
      assert.ok(update, 'expected a contacts.update (PATCH by email)');
      assert.ok(update.url.includes(recipient), 'update should key on the recipient email');
      assert.equal(update.body.unsubscribed, false);

      const create = calls.find((c) => c.method === 'POST' && c.url === CONTACTS_URL);
      assert.ok(create, 'expected a contacts.create fallback when the contact is not found');
      assert.equal(create.body.email, recipient);
      assert.equal(create.body.unsubscribed, false);
    });
  }

  it('a failing contact upsert never fails the send (best-effort, off the critical path)', async () => {
    const handler = (call) =>
      call.url.startsWith(CONTACTS_URL)
        ? jsonResponse(500, { name: 'application_error', message: 'boom', statusCode: 500 })
        : null;
    const { calls, restore } = installFetch(handler);
    try {
      await assert.doesNotReject(
        sendOtpEmail({ email: 'signup@example.com', otp: '123456', ttlMinutes: 10 }),
      );
      await flush();
    } finally {
      restore();
    }
    assert.ok(
      calls.some((c) => c.url === EMAILS_URL),
      'the transactional send still ran',
    );
  });

  it('rejects with a redacted EmailDeliveryError on send failure, leaking no recipient/OTP', async () => {
    // The Resend error message deliberately contains the recipient to prove we never propagate it.
    const handler = (call) =>
      call.url === EMAILS_URL
        ? jsonResponse(429, {
            name: 'rate_limit_exceeded',
            message: 'Too many requests for leak@example.com',
            statusCode: 429,
          })
        : null;
    const { restore } = installFetch(handler);
    try {
      await assert.rejects(
        () => sendOtpEmail({ email: 'leak@example.com', otp: '654321', ttlMinutes: 10 }),
        (err) => {
          assert.equal(err.name, 'EmailDeliveryError');
          assert.equal(err.code, 'rate_limit_exceeded');
          assert.equal(err.statusCode, 429);
          const serialized = `${err.message} ${JSON.stringify(err)}`;
          assert.doesNotMatch(serialized, /leak@example\.com/, 'must not leak the recipient');
          assert.doesNotMatch(serialized, /654321/, 'must not leak the OTP');
          return true;
        },
      );
    } finally {
      restore();
    }
  });

  it('still produces a usable code when the Resend error omits `name` (e.g. 403 unauthorized domain)', async () => {
    const handler = (call) =>
      call.url === EMAILS_URL
        ? jsonResponse(403, {
            message: 'This API key is not authorized to send emails from example.com',
            statusCode: 403,
          })
        : null;
    const { restore } = installFetch(handler);
    try {
      await assert.rejects(
        () => sendOtpEmail({ email: 'leak@example.com', otp: '654321', ttlMinutes: 10 }),
        (err) => {
          assert.equal(err.name, 'EmailDeliveryError');
          assert.equal(typeof err.code, 'string');
          assert.ok(err.code.length > 0, 'code must be a non-empty string even without error.name');
          assert.equal(err.statusCode, 403);
          assert.doesNotMatch(`${err.message} ${JSON.stringify(err)}`, /leak@example\.com/);
          return true;
        },
      );
    } finally {
      restore();
    }
  });

  it('simulates (no Resend call) when RESEND_API_KEY is missing', async () => {
    const original = env.RESEND_API_KEY;
    const { calls, restore } = installFetch();
    env.RESEND_API_KEY = undefined;
    try {
      await sendOtpEmail({ email: 'signup@example.com', otp: '123456', ttlMinutes: 10 });
      await flush();
      assert.equal(calls.length, 0, 'expected no Resend HTTP call in simulate mode');
    } finally {
      env.RESEND_API_KEY = original;
      restore();
    }
  });

  it('simulates when the key is present but not re_-prefixed', async () => {
    const original = env.RESEND_API_KEY;
    const { calls, restore } = installFetch();
    env.RESEND_API_KEY = 'sk_wrong_prefix';
    try {
      await sendInvitationEmail({
        email: 'invitee@example.com',
        invitationLink: 'https://app.trafficmena.com/invite/abc',
        expiresAt: new Date(Date.now() + 86_400_000),
      });
      await flush();
      assert.equal(calls.length, 0, 'expected no Resend HTTP call in simulate mode');
    } finally {
      env.RESEND_API_KEY = original;
      restore();
    }
  });
});

// Bulk invitation rows surface specific, actionable reasons instead of opaque "Unknown error".
describe('bulk send failures map to specific reasons', () => {
  it('maps known Resend error codes to actionable, non-"Unknown error" reasons', () => {
    const codes = [
      'rate_limit_exceeded',
      'validation_error',
      'daily_quota_exceeded',
      'monthly_quota_exceeded',
      'restricted_api_key',
    ];
    for (const code of codes) {
      const reason = mapEmailDeliveryReason(code);
      assert.notEqual(reason, 'Unknown error');
      assert.ok(reason.length > 0);
    }
    assert.match(mapEmailDeliveryReason('rate_limit_exceeded'), /rate limit/i);
    assert.match(mapEmailDeliveryReason('validation_error'), /domain|recipient|rejected/i);
    assert.match(mapEmailDeliveryReason('daily_quota_exceeded'), /quota/i);
    assert.match(mapEmailDeliveryReason('restricted_api_key'), /permission|key/i);
  });
});
