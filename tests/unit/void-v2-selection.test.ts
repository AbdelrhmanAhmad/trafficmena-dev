import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// The void script imports db/client (lazy pg pool — no connection on import) and guards its run()
// behind an import.meta main-check, so importing the pure predicate here is side-effect-free.
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const { isVoidCandidate } = await import('../../server/scripts/void-v2-pending-payments.ts');

describe('void-v2 selection predicate', () => {
  it('selects pending and expired v2 rows (invoice set, no intent)', () => {
    assert.equal(
      isVoidCandidate({ status: 'pending', fawaterkInvoiceId: 123, fawaterkIntentKey: null }),
      true,
    );
    assert.equal(
      isVoidCandidate({ status: 'expired', fawaterkInvoiceId: 123, fawaterkIntentKey: null }),
      true,
    );
  });

  it('excludes v3 rows (intent key present)', () => {
    assert.equal(
      isVoidCandidate({ status: 'pending', fawaterkInvoiceId: 123, fawaterkIntentKey: 'uuid' }),
      false,
    );
    // A v3-only row (intent, no legacy invoice) is also excluded.
    assert.equal(
      isVoidCandidate({ status: 'pending', fawaterkInvoiceId: null, fawaterkIntentKey: 'uuid' }),
      false,
    );
  });

  it('excludes terminal rows (paid/failed)', () => {
    assert.equal(
      isVoidCandidate({ status: 'paid', fawaterkInvoiceId: 123, fawaterkIntentKey: null }),
      false,
    );
    assert.equal(
      isVoidCandidate({ status: 'failed', fawaterkInvoiceId: 123, fawaterkIntentKey: null }),
      false,
    );
  });

  it('excludes free rows (no invoice id)', () => {
    assert.equal(
      isVoidCandidate({ status: 'pending', fawaterkInvoiceId: null, fawaterkIntentKey: null }),
      false,
    );
  });
});
