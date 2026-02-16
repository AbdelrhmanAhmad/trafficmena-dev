import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getActiveSubscriptionMetrics,
  getActiveSubscriptionMetricsFromAggregate,
} from '../../server/src/routes/api/adminMetricsUtils.ts';

describe('admin metrics subscription revenue', () => {
  it('returns zero revenue when no active subscriptions exist', () => {
    const result = getActiveSubscriptionMetrics([]);

    assert.equal(result.activeSubscriptions, 0);
    assert.equal(result.premiumUsers, 0);
    assert.equal(result.revenueCents, 0);
  });

  it('counts unique users and sums revenue across active subscriptions', () => {
    const result = getActiveSubscriptionMetrics([
      { userId: 'user-1', pricePaidCents: 5000, source: 'paid' },
      { userId: 'user-1', pricePaidCents: 5000, source: 'paid' },
      { userId: 'user-2', pricePaidCents: 2500, source: 'paid' },
      { userId: 'user-3', pricePaidCents: 0, source: 'legacy' },
      { userId: 'user-4', pricePaidCents: 0, source: 'gift' },
    ]);

    assert.equal(result.activeSubscriptions, 4);
    assert.equal(result.premiumUsers, 4);
    assert.equal(result.revenueCents, 12500);
  });

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
