import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeBulkSubscriptionGrantRows } from '../../server/src/routes/api/subscriptionsGrantUtils.ts';

describe('subscription grants deduplication stability', () => {
  it('keeps the first row per resolved user id', () => {
    const result = normalizeBulkSubscriptionGrantRows({
      rows: [
        {
          line: 2,
          email: 'member@example.com',
          source: 'legacy',
          grantReason: 'First row',
        },
        {
          line: 3,
          email: 'member+alias@example.com',
          source: 'gift',
          grantReason: 'Second row',
        },
      ],
      userIdByEmail: new Map([
        ['member@example.com', 'user-1'],
        ['member+alias@example.com', 'user-1'],
      ]),
    });

    assert.equal(result.errors.length, 0);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0]?.line, 2);
    assert.equal(result.rows[0]?.grantReason, 'First row');
  });
});
