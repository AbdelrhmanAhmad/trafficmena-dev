import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeBulkSubscriptionGrantRows } from '../../server/src/routes/api/subscriptionsGrantUtils.ts';

describe('subscription grants validation', () => {
  it('returns validation errors when csv emails do not map to users', () => {
    const result = normalizeBulkSubscriptionGrantRows({
      rows: [
        {
          line: 2,
          email: 'missing@example.com',
          source: 'legacy',
          grantReason: 'Legacy migration',
        },
      ],
      userIdByEmail: new Map(),
    });

    assert.equal(result.rows.length, 0);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0]?.email, 'missing@example.com');
  });
});
