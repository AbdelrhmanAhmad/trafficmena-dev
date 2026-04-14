import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasTrackBookingRow } from '../../server/src/utils/booking.ts';

describe('track booking flag', () => {
  it('treats empty booking rows as not booked', () => {
    assert.equal(hasTrackBookingRow([]), false);
  });

  it('treats presence of a booking row as booked', () => {
    assert.equal(hasTrackBookingRow([{ id: 'booking-1' }]), true);
  });

  it('ignores revoked booking rows', () => {
    assert.equal(
      hasTrackBookingRow([{ id: 'booking-1', revokedAt: new Date('2026-04-13T10:00:00.000Z') }]),
      false,
    );
  });
});
