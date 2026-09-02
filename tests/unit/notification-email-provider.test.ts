import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';
process.env.RESEND_API_KEY = 're_test_key_for_notification_email_provider';

const { ResendEmailProvider, getEmailProvider } = await import(
  '../../server/src/services/notifications/emailProvider.ts'
);

const EMAILS_URL = 'https://api.resend.com/emails';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const installFetch = () => {
  const realFetch = globalThis.fetch;
  const calls: Array<{ url: string; body: any }> = [];
  let counter = 0;
  globalThis.fetch = async (url, init = {}) => {
    const call = {
      url: String(url),
      body: init.body ? JSON.parse(String(init.body)) : null,
    };
    calls.push(call);
    return jsonResponse(200, { id: `res_notif_${++counter}` });
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = realFetch;
    },
  };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 15));

describe('notification email provider', () => {
  it('getEmailProvider returns ResendEmailProvider', () => {
    assert.ok(getEmailProvider() instanceof ResendEmailProvider);
  });

  it('ResendEmailProvider.send posts through Resend and returns providerMessageId', async () => {
    const { calls, restore } = installFetch();
    try {
      const provider = new ResendEmailProvider();
      const result = await provider.send({
        to: 'member@example.com',
        subject: 'Test notification',
        html: '<p>Hello</p>',
        text: 'Hello',
      });
      await flush();

      assert.equal(result.providerMessageId, 'res_notif_1');
      const send = calls.find((c) => c.url === EMAILS_URL);
      assert.ok(send, 'expected POST to Resend /emails');
      assert.equal(send.body.to, 'member@example.com');
      assert.equal(send.body.subject, 'Test notification');
    } finally {
      restore();
    }
  });
});
