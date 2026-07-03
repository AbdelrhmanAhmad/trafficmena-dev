import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getTransactionDataPaid, INTENT_KEY, oauthTokenSuccess } from './fixtures/fawaterk-v3.ts';

// fawaterk.ts -> config/env.ts parses process.env at import time. Prime required vars + OAuth creds.
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';
process.env.FAWATERK_API_KEY ??= 'test-vendor-api-key-fawaterk-v3';
process.env.FAWATERK_CLIENT_ID ??= '11111111-2222-4333-8444-555555555555';
process.env.FAWATERK_CLIENT_SECRET ??= 'test-client-secret-value';
process.env.FAWATERK_ENV ??= 'staging';

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// The token cache + circuit state are module-level, so each behavioral test imports a FRESH module
// instance via a cache-busting query. config/env.ts is imported without a bust, so it stays shared.
let bustCounter = 0;
const freshFawaterk = () => {
  bustCounter += 1;
  return import(`../../server/src/services/fawaterk.ts?bust=${bustCounter}`);
};

const installFetch = (route) => {
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const call = { url: String(url), method: (init.method || 'GET').toUpperCase() };
    calls.push(call);
    const routed = route?.(call);
    if (routed) return routed;
    if (call.url.includes('/oauth/token')) return jsonResponse(200, oauthTokenSuccess);
    return jsonResponse(200, {});
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = realFetch;
    },
  };
};

const tokenCalls = (calls) => calls.filter((c) => c.url.includes('/oauth/token')).length;
const trRoute = (call) =>
  call.url.includes('/api/v3/getTransactionData')
    ? jsonResponse(200, getTransactionDataPaid)
    : null;

describe('fawaterk v3 OAuth token manager', () => {
  it('concurrent first calls trigger exactly one /oauth/token request (single-flight)', async () => {
    const { getTransactionData } = await freshFawaterk();
    const { calls, restore } = installFetch(trRoute);
    try {
      await Promise.all(Array.from({ length: 5 }, () => getTransactionData(INTENT_KEY)));
      assert.equal(tokenCalls(calls), 1);
    } finally {
      restore();
    }
  });

  it('reuses the cached token within its expiry window', async () => {
    const { getTransactionData } = await freshFawaterk();
    const { calls, restore } = installFetch((call) =>
      call.url.includes('/oauth/token')
        ? jsonResponse(200, { ...oauthTokenSuccess, expires_in: 31_536_000 })
        : trRoute(call),
    );
    try {
      await getTransactionData(INTENT_KEY);
      await getTransactionData(INTENT_KEY);
      assert.equal(tokenCalls(calls), 1);
    } finally {
      restore();
    }
  });

  it('refetches the token once it is within the refresh margin of expiry', async () => {
    const { getTransactionData } = await freshFawaterk();
    // expires_in below the 60s refresh margin → the token is considered stale immediately.
    const { calls, restore } = installFetch((call) =>
      call.url.includes('/oauth/token')
        ? jsonResponse(200, { ...oauthTokenSuccess, expires_in: 30 })
        : trRoute(call),
    );
    try {
      await getTransactionData(INTENT_KEY);
      await getTransactionData(INTENT_KEY);
      assert.equal(tokenCalls(calls), 2);
    } finally {
      restore();
    }
  });

  it('a 401 on a v3 call invalidates the token, refreshes, and retries once', async () => {
    const { getTransactionData } = await freshFawaterk();
    let trHits = 0;
    const { calls, restore } = installFetch((call) => {
      if (call.url.includes('/api/v3/getTransactionData')) {
        trHits += 1;
        return trHits === 1
          ? jsonResponse(401, { status: 'error' })
          : jsonResponse(200, getTransactionDataPaid);
      }
      return null;
    });
    try {
      const res = await getTransactionData(INTENT_KEY);
      assert.equal(res.paid, 1);
      assert.equal(trHits, 2, 'the call retried exactly once');
      assert.equal(tokenCalls(calls), 2, 'token refreshed after the 401');
    } finally {
      restore();
    }
  });

  it('a persistent 401 surfaces as an error (no infinite retry)', async () => {
    const { getTransactionData } = await freshFawaterk();
    let trHits = 0;
    const { restore } = installFetch((call) => {
      if (call.url.includes('/api/v3/getTransactionData')) {
        trHits += 1;
        return jsonResponse(401, { status: 'error' });
      }
      return null;
    });
    try {
      await assert.rejects(() => getTransactionData(INTENT_KEY));
      assert.equal(trHits, 2, 'exactly one retry, then give up');
    } finally {
      restore();
    }
  });

  it('a token-endpoint 401 throws without leaking the client secret', async () => {
    const { getTransactionData } = await freshFawaterk();
    const { restore } = installFetch((call) =>
      call.url.includes('/oauth/token')
        ? jsonResponse(401, { status: 'error', message: 'invalid client' })
        : null,
    );
    try {
      await assert.rejects(
        () => getTransactionData(INTENT_KEY),
        (err) => {
          const serialized = `${err.message} ${JSON.stringify(err)}`;
          assert.doesNotMatch(serialized, /test-client-secret-value/, 'must not leak the secret');
          assert.match(err.message, /OAuth|token/i);
          return true;
        },
      );
    } finally {
      restore();
    }
  });
});

describe('fawaterk v3 production boot guard', () => {
  it('throws when the OAuth client credentials are missing in production', async () => {
    const saved = { ...process.env };
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
    process.env.BETTER_AUTH_SECRET = 'test-secret-value-with-at-least-32-characters';
    process.env.FAWATERK_API_KEY = 'prod-api-key';
    process.env.RESEND_API_KEY = 're_prod_key';
    process.env.INVITE_SESSION_SECRET = 'invite-secret-16chars';
    process.env.CORS_ORIGIN = 'https://www.trafficmena.com';
    delete process.env.FAWATERK_CLIENT_ID;
    delete process.env.FAWATERK_CLIENT_SECRET;
    try {
      await assert.rejects(
        () => import(`../../server/src/config/env.ts?prodguard=${Date.now()}`),
        (err) => {
          assert.match(String(err?.message ?? err), /FAWATERK_CLIENT_ID|FAWATERK_CLIENT_SECRET/);
          return true;
        },
      );
    } finally {
      for (const key of Object.keys(process.env)) {
        if (!(key in saved)) delete process.env[key];
      }
      Object.assign(process.env, saved);
    }
  });
});
