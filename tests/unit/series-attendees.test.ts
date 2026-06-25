import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergeSeriesAttendees } from '../../server/src/utils/seriesAttendees.ts';

const booking = (over = {}) => ({
  userId: 'u-book',
  email: 'buyer@example.com',
  name: 'Track Buyer',
  firstName: null,
  lastName: null,
  phoneNumber: '+201012345678',
  bookedAt: '2026-01-10T10:00:00.000Z',
  invoiceId: 555,
  invoiceNumber: 'INV-555',
  source: 'paid',
  reference: 'INV-555',
  amountPaidCents: 80000,
  ...over,
});

const grant = (over = {}) => ({
  grantId: 'g-1',
  userId: 'u-grant',
  email: 'granted@example.com',
  name: 'Granted Member',
  firstName: null,
  lastName: null,
  phoneNumber: null,
  grantedAt: '2026-02-01T09:00:00.000Z',
  grantReason: 'VIP access',
  ...over,
});

const opts = (over = {}) => ({ page: 1, pageSize: 20, ...over });

describe('mergeSeriesAttendees', () => {
  it('returns linked-track bookers with grantId=null and their stored amount', () => {
    const { items, total } = mergeSeriesAttendees([booking()], [], opts());
    assert.equal(total, 1);
    assert.equal(items[0].grantId, null);
    assert.equal(items[0].source, 'paid');
    assert.equal(items[0].amountPaidCents, 80000);
  });

  it('maps a manual grant (no booking) into a row with grantId set and no amount', () => {
    const { items, total } = mergeSeriesAttendees([], [grant()], opts());
    assert.equal(total, 1);
    assert.equal(items[0].grantId, 'g-1');
    assert.equal(items[0].source, 'manual');
    assert.equal(items[0].amountPaidCents, null);
    assert.equal(items[0].reference, 'VIP access');
    assert.equal(items[0].invoiceId, null);
  });

  it('dedupes a user who is both a buyer and granted: booking row wins (grantId=null)', () => {
    const sharedUser = 'u-shared';
    const { items, total } = mergeSeriesAttendees(
      [booking({ userId: sharedUser })],
      [grant({ userId: sharedUser, grantId: 'g-shared' })],
      opts(),
    );
    assert.equal(total, 1);
    assert.equal(items[0].grantId, null);
    assert.equal(items[0].amountPaidCents, 80000);
  });

  it('with no linked track (empty bookings) returns grants only', () => {
    const { items, total } = mergeSeriesAttendees(
      [],
      [grant({ userId: 'a' }), grant({ userId: 'b', grantId: 'g-2' })],
      opts(),
    );
    assert.equal(total, 2);
    assert.ok(items.every((r) => r.grantId !== null && r.source === 'manual'));
  });

  it('search matches name/email/phone and excludes non-matches', () => {
    const rows = [
      booking({ userId: 'u1', name: 'Alice', email: 'alice@x.com' }),
      booking({ userId: 'u2', name: 'Bob', email: 'bob@y.com', phoneNumber: '+201298765432' }),
    ];
    assert.equal(mergeSeriesAttendees(rows, [], opts({ search: 'alice' })).total, 1);
    assert.equal(mergeSeriesAttendees(rows, [], opts({ search: '298765432' })).total, 1);
    assert.equal(mergeSeriesAttendees(rows, [], opts({ search: 'nobody' })).total, 0);
  });

  it('sorts by bookedAt descending (newest first)', () => {
    const older = booking({ userId: 'old', bookedAt: '2026-01-01T00:00:00.000Z' });
    const newer = grant({ userId: 'new', grantedAt: '2026-03-01T00:00:00.000Z' });
    const { items } = mergeSeriesAttendees([older], [newer], opts());
    assert.equal(items[0].userId, 'new');
    assert.equal(items[1].userId, 'old');
  });

  it('paginates the merged result and reports the deduped total', () => {
    const grants = Array.from({ length: 5 }, (_, i) =>
      grant({ userId: `u${i}`, grantId: `g${i}`, grantedAt: `2026-0${i + 1}-01T00:00:00.000Z` }),
    );
    const { items, total } = mergeSeriesAttendees([], grants, opts({ page: 2, pageSize: 2 }));
    assert.equal(total, 5);
    assert.equal(items.length, 2);
  });
});
