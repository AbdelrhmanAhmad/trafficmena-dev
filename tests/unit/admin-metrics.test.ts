import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getActiveSubscriptionMetricsFromAggregate } from '../../server/src/routes/api/adminMetricsUtils.ts';

describe('admin metrics subscription revenue', () => {
  it('normalizes aggregate rows from SQL values', () => {
    const result = getActiveSubscriptionMetricsFromAggregate({
      premiumUsers: '4',
      revenueCents: '12500',
    });

    assert.equal(result.activeSubscriptions, 4);
    assert.equal(result.premiumUsers, 4);
    assert.equal(result.revenueCents, 12500);
  });

  it('handles empty aggregate rows defensively', () => {
    const result = getActiveSubscriptionMetricsFromAggregate(null);

    assert.equal(result.activeSubscriptions, 0);
    assert.equal(result.premiumUsers, 0);
    assert.equal(result.revenueCents, 0);
  });
});
