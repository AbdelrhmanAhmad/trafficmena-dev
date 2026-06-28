import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// email.ts -> config/env.ts parses process.env at import time, so set the required vars first.
// PLUNK_API_KEY must start with "sk_" or sendXxxEmail short-circuits and never calls Plunk.
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';
process.env.PLUNK_API_KEY = 'sk_test_key_for_unit_tests';

const { sendOtpEmail, sendInvitationEmail, sendEmailChangeNotice } = await import(
  '../../server/src/services/email.ts'
);

// Swap global fetch for a capturing stub, run the send, return the parsed Plunk request body.
const capturePlunkSend = async (run) => {
  const realFetch = globalThis.fetch;
  let captured = null;
  globalThis.fetch = async (url, init) => {
    captured = { url, init };
    return new Response(null, { status: 200 });
  };
  try {
    await run();
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.ok(captured, 'expected a Plunk request to be sent (PLUNK_API_KEY must start with sk_)');
  return { url: captured.url, body: JSON.parse(captured.init.body) };
};

// Regression: every transactional send must mark the contact subscribed in Plunk. Without
// "subscribed: true", Plunk's /v1/send upserts contacts as unsubscribed (its documented default),
// which is why signed-up users never landed on the marketing list.
describe('Plunk transactional sends subscribe the contact', () => {
  it('sendOtpEmail sends subscribed: true (the signup/login path)', async () => {
    const { url, body } = await capturePlunkSend(() =>
      sendOtpEmail({ email: 'signup@example.com', otp: '123456', ttlMinutes: 10 }),
    );
    assert.equal(url, 'https://next-api.useplunk.com/v1/send');
    assert.equal(body.subscribed, true);
  });

  it('sendInvitationEmail sends subscribed: true', async () => {
    const { body } = await capturePlunkSend(() =>
      sendInvitationEmail({
        email: 'invitee@example.com',
        invitationLink: 'https://app.trafficmena.com/invite/abc',
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    );
    assert.equal(body.subscribed, true);
  });

  it('sendEmailChangeNotice sends subscribed: true', async () => {
    const { body } = await capturePlunkSend(() =>
      sendEmailChangeNotice({
        email: 'old@example.com',
        status: 'requested',
        maskedNewEmail: 'n***@example.com',
      }),
    );
    assert.equal(body.subscribed, true);
  });
});
