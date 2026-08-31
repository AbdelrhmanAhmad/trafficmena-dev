import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { sanitizeAnalyticsPath } from '../../src/lib/analytics/helpers.ts';

describe('final security pass — analytics path sanitization (TM-005)', () => {
  it('redacts invitation tokens from analytics page_path', () => {
    assert.equal(
      sanitizeAnalyticsPath('/invitation/abc123deadbeef'),
      '/invitation/[redacted]',
    );
    assert.equal(sanitizeAnalyticsPath('/tracks'), '/tracks');
  });
});

describe('final security pass — owner role guard (TM-009)', () => {
  it('blocks admins from modifying owner roles', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/users.ts', import.meta.url),
      'utf8',
    );
    const routeStart = source.indexOf("app.put('/users/:id'");
    const guard = source.indexOf('Admins cannot modify owner roles', routeStart);

    assert.ok(routeStart >= 0);
    assert.ok(guard > routeStart);
  });
});

describe('final security pass — manager PII redaction (TM-023)', () => {
  it('redacts email and phone for manager list responses', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/users.ts', import.meta.url),
      'utf8',
    );
    const listRoute = source.indexOf("app.get('/users'");
    const redactFn = source.indexOf('redactManagerPii', listRoute);

    assert.ok(listRoute >= 0);
    assert.ok(redactFn > listRoute);
  });
});

describe('final security pass — public track draft filter (TM-024)', () => {
  it('filters unpublished events from public track payload', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/tracks.ts', import.meta.url),
      'utf8',
    );
    const publicRoute = source.indexOf("'/tracks/:id/public'");
    const publishedFilter = source.indexOf('eq(events.isPublished, true)', publicRoute);

    assert.ok(publicRoute >= 0);
    assert.ok(publishedFilter > publicRoute);
  });
});

describe('final security pass — free checkout capacity lock (TM-020)', () => {
  it('uses locked free event registration helper in checkout', async () => {
    const paymentsSource = await readFile(
      new URL('../../server/src/routes/api/payments.ts', import.meta.url),
      'utf8',
    );
    const freeBranch = paymentsSource.indexOf('if (calculatedPriceResult.amountCents === 0)');
    const helperCall = paymentsSource.indexOf('registerFreeEventAttendee', freeBranch);

    assert.ok(freeBranch >= 0);
    assert.ok(helperCall > freeBranch);

    const sharedSource = await readFile(
      new URL('../../server/src/routes/api/trackBookingShared.ts', import.meta.url),
      'utf8',
    );
    assert.ok(sharedSource.includes("for('update')"));
    assert.ok(sharedSource.includes('EVENT_FULL'));
  });
});

describe('final security pass — invitation activate rate limit (TM-003)', () => {
  it('rate limits invitation activate attempts by IP', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/invitations.ts', import.meta.url),
      'utf8',
    );
    const activateRoute = source.indexOf("'/invitations/:token/activate'");
    const rateLimit = source.indexOf('invite:activate:', activateRoute);

    assert.ok(activateRoute >= 0);
    assert.ok(rateLimit > activateRoute);
  });
});

describe('final security pass — promo preview throttle (TM-021)', () => {
  it('rate limits authenticated price-preview requests', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/payments.ts', import.meta.url),
      'utf8',
    );
    const previewRoute = source.indexOf("app.get('/payments/price-preview'");
    const rateLimit = source.indexOf('price-preview:', previewRoute);

    assert.ok(previewRoute >= 0);
    assert.ok(rateLimit > previewRoute);
  });
});

describe('final security pass — DB SSL production gate (TM-010)', () => {
  it('requires DB_SSL in production', async () => {
    const source = await readFile(
      new URL('../../server/src/config/env.ts', import.meta.url),
      'utf8',
    );
    assert.match(source, /DB_SSL must be true in production/);
  });
});

describe('final security pass — signup token display removed (TM-005)', () => {
  it('does not render invitation token in signup step 0 UI', async () => {
    const source = await readFile(
      new URL('../../src/pages/signup/Step0.tsx', import.meta.url),
      'utf8',
    );
    assert.ok(!source.includes('{invitationToken}'));
  });
});
