import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveRemoveEventFlow } from '../../src/features/tracks/utils/removeEventGate.ts';

describe('resolveRemoveEventFlow (admin remove-session UI gate)', () => {
  it('shows the override dialog to admins on a booked track', () => {
    assert.equal(
      resolveRemoveEventFlow({ canDeleteContent: true, activeBookingsCount: 3 }),
      'override-dialog',
    );
  });

  it('blocks managers on a booked track', () => {
    assert.equal(
      resolveRemoveEventFlow({ canDeleteContent: false, activeBookingsCount: 3 }),
      'blocked',
    );
  });

  it('keeps the simple confirm for admins on an unbooked track', () => {
    assert.equal(
      resolveRemoveEventFlow({ canDeleteContent: true, activeBookingsCount: 0 }),
      'simple-confirm',
    );
  });

  it('keeps the simple confirm for managers on an unbooked track', () => {
    assert.equal(
      resolveRemoveEventFlow({ canDeleteContent: false, activeBookingsCount: 0 }),
      'simple-confirm',
    );
  });

  it('treats a missing booking count as zero (simple confirm)', () => {
    assert.equal(resolveRemoveEventFlow({ canDeleteContent: true }), 'simple-confirm');
    assert.equal(
      resolveRemoveEventFlow({ canDeleteContent: false, activeBookingsCount: undefined }),
      'simple-confirm',
    );
  });
});
