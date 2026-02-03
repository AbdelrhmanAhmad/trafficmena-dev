import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getActiveSubscriptionMetrics } from '../../server/src/routes/api/adminMetricsUtils.ts';

describe('admin metrics subscription revenue', () => {
  it('returns zero revenue when no active subscriptions exist', () => {
    const result = getActiveSubscriptionMetrics([]);

    assert.equal(result.activeSubscriptions, 0);
    assert.equal(result.premiumUsers, 0);
    assert.equal(result.revenueCents, 0);
  });

  it('counts unique users and sums revenue across active subscriptions', () => {
    const result = getActiveSubscriptionMetrics([
      { userId: 'user-1', pricePaidCents: 5000 },
      { userId: 'user-1', pricePaidCents: 5000 },
      { userId: 'user-2', pricePaidCents: 2500 },
    ]);

    assert.equal(result.activeSubscriptions, 2);
    assert.equal(result.premiumUsers, 2);
    assert.equal(result.revenueCents, 12500);
  });
});
