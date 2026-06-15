import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectActiveSubscriptionConflicts,
  normalizeBulkSubscriptionGrantRows,
  type SubscriptionGrantCsvRow,
} from '../../server/src/routes/api/subscriptionsGrantUtils.ts';

describe('subscription grants bulk normalization', () => {
  it('rejects header-only CSV rows after parsing', () => {
    const result = normalizeBulkSubscriptionGrantRows({
      rows: [],
      userIdByEmail: new Map(),
    });

    assert.equal(result.rows.length, 0);
    assert.equal(result.errors.length, 1);
    assert.equal(
      result.errors[0]?.reason,
      'CSV contains no valid rows. No subscriptions were granted.',
    );
  });

  it('deduplicates repeated users by user id', () => {
    const rows: SubscriptionGrantCsvRow[] = [
      {
        line: 2,
        email: 'member@example.com',
        source: 'legacy',
        grantReason: 'Migration grant',
      },
      {
        line: 3,
        email: 'member@example.com',
        source: 'gift',
        grantReason: 'Duplicate row',
      },
    ];

    const result = normalizeBulkSubscriptionGrantRows({
      rows,
      userIdByEmail: new Map([['member@example.com', 'user-1']]),
    });

    assert.equal(result.errors.length, 0);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0]?.userId, 'user-1');
    assert.equal(result.rows[0]?.line, 2);
    assert.equal(result.rows[0]?.source, 'legacy');
  });

  it('builds validation errors for users with active subscriptions', () => {
    const rowsResult = normalizeBulkSubscriptionGrantRows({
      rows: [
        {
          line: 2,
          email: 'member@example.com',
          source: 'legacy',
          grantReason: 'Migration grant',
        },
      ],
      userIdByEmail: new Map([['member@example.com', 'user-1']]),
    });

    if (rowsResult.errors.length > 0) {
      throw new Error('Expected normalized rows with no preprocessing errors');
    }

    const errors = collectActiveSubscriptionConflicts({
      rows: rowsResult.rows,
      activeEndsAtByUserId: new Map([['user-1', new Date('2027-02-01T00:00:00.000Z')]]),
    });

    assert.equal(errors.length, 1);
    assert.equal(errors[0]?.line, 2);
    assert.equal(errors[0]?.reason, 'Active subscription exists until 2027-02-01T00:00:00.000Z.');
  });
});
