import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

/**
 * Regression: ECD /pay was sending cartTotal = discounted total but cartItems.price
 * = full unit price. Fawaterk rejects the mismatch → "Payment didn't go through".
 * Hub checkout always sends a single line item at the charged amount.
 */
describe('ECD pay cart totals with promo', () => {
  it('sends cartItems at charged total (not full unit price)', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/ecd/payments.ts', import.meta.url),
      'utf8',
    );
    const createIdx = source.indexOf('await createTransaction({');
    assert.ok(createIdx > 0, 'createTransaction call must exist');
    const block = source.slice(createIdx, createIdx + 1200);

    assert.ok(
      block.includes('cartTotal: booking.totalCents / 100') ||
        block.includes('cartTotal: chargedEgp'),
      'cartTotal must use booking.totalCents (promo-aware)',
    );
    assert.ok(
      block.includes('price: chargedEgp') ||
        block.includes('price: Number((booking.totalCents / 100).toFixed(2))') ||
        block.includes("price: Number((booking.totalCents / booking.qty / 100)"),
      'cartItems.price must match charged amount, not unitPriceCents',
    );
    assert.equal(
      /price:\s*unitEgp/.test(block),
      false,
      'cartItems must not use undiscounted unitEgp (breaks promo checkout)',
    );
  });
});
