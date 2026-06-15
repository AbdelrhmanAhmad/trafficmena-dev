import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getTrackBookingState } from '../../src/features/tracks/utils/trackBookingState.ts';

describe('track booking state', () => {
  it('returns booked when user has booked', () => {
    assert.equal(
      getTrackBookingState({ userHasBooked: true, userHasPendingPayment: false }),
      'booked',
    );
  });

  it('returns pending when payment is pending', () => {
    assert.equal(
      getTrackBookingState({ userHasBooked: false, userHasPendingPayment: true }),
      'pending',
    );
  });

  it('returns available when no booking or pending payment', () => {
    assert.equal(
      getTrackBookingState({ userHasBooked: false, userHasPendingPayment: false }),
      'available',
    );
  });
});
