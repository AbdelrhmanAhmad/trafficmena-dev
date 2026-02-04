import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isInvoicePaid } from '../../server/src/utils/invoiceStatus.ts';

describe('invoice status', () => {
  it('returns true only when paid === 1', () => {
    assert.equal(isInvoicePaid({ paid: 1, paid_at: null }), true);
  });

  it('returns false for unpaid invoices', () => {
    assert.equal(isInvoicePaid({ paid: 0, paid_at: null }), false);
    assert.equal(isInvoicePaid({ paid: 2, paid_at: '2026-02-03T12:00:00Z' }), false);
  });

  it('returns false for missing invoice data', () => {
    assert.equal(isInvoicePaid(null), false);
    assert.equal(isInvoicePaid(undefined), false);
  });
});
