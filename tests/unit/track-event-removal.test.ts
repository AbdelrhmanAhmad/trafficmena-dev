import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  evaluateTrackEventRemoval,
  REMOVAL_REASON_MAX_LENGTH,
  REMOVAL_REASON_MIN_LENGTH,
} from '../../server/src/routes/api/trackEventRemoval.ts';

describe('evaluateTrackEventRemoval (session-removal authorization matrix)', () => {
  it('allows a manager to remove from a track with zero active bookings, no reason required (AE3)', () => {
    const decision = evaluateTrackEventRemoval({ role: 'manager', activeBookingCount: 0 });
    assert.equal(decision.allowed, true);
    if (decision.allowed) {
      assert.equal(decision.override, false);
      assert.equal(decision.reason, null);
    }
  });

  it('blocks a manager on a booked track with TRACK_HAS_BOOKINGS (AE2)', () => {
    const decision = evaluateTrackEventRemoval({ role: 'manager', activeBookingCount: 2 });
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, 'TRACK_HAS_BOOKINGS');
    }
  });

  it('rejects an admin on a booked track with no reason (REASON_REQUIRED)', () => {
    const decision = evaluateTrackEventRemoval({ role: 'admin', activeBookingCount: 2 });
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, 'REASON_REQUIRED');
    }
  });

  it('rejects an admin on a booked track when the reason is too short', () => {
    const decision = evaluateTrackEventRemoval({
      role: 'admin',
      activeBookingCount: 2,
      reason: 'ab',
    });
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, 'REASON_REQUIRED');
    }
  });

  it('rejects an admin on a booked track when the reason is too long', () => {
    const decision = evaluateTrackEventRemoval({
      role: 'admin',
      activeBookingCount: 2,
      reason: 'a'.repeat(REMOVAL_REASON_MAX_LENGTH + 1),
    });
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, 'REASON_REQUIRED');
    }
  });

  it('allows an admin on a booked track with a valid reason and flags the override', () => {
    const decision = evaluateTrackEventRemoval({
      role: 'admin',
      activeBookingCount: 2,
      reason: 'Speaker cancelled',
    });
    assert.equal(decision.allowed, true);
    if (decision.allowed) {
      assert.equal(decision.override, true);
      assert.equal(decision.reason, 'Speaker cancelled');
    }
  });

  it('treats an owner identically to an admin on a booked track', () => {
    const decision = evaluateTrackEventRemoval({
      role: 'owner',
      activeBookingCount: 2,
      reason: 'Speaker cancelled',
    });
    assert.equal(decision.allowed, true);
    if (decision.allowed) {
      assert.equal(decision.override, true);
    }
  });

  it('trims surrounding whitespace before validating and storing the reason', () => {
    const decision = evaluateTrackEventRemoval({
      role: 'admin',
      activeBookingCount: 3,
      reason: '   Speaker cancelled   ',
    });
    assert.equal(decision.allowed, true);
    if (decision.allowed) {
      assert.equal(decision.reason, 'Speaker cancelled');
    }
  });

  it('rejects a whitespace-only reason (trims to empty, below minimum)', () => {
    const decision = evaluateTrackEventRemoval({
      role: 'admin',
      activeBookingCount: 3,
      reason: '   ',
    });
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, 'REASON_REQUIRED');
    }
  });

  it('accepts a reason exactly at the minimum length after trimming', () => {
    const decision = evaluateTrackEventRemoval({
      role: 'admin',
      activeBookingCount: 1,
      reason: `  ${'x'.repeat(REMOVAL_REASON_MIN_LENGTH)}  `,
    });
    assert.equal(decision.allowed, true);
  });

  it('never requires a reason on a zero-booking track regardless of role', () => {
    const adminDecision = evaluateTrackEventRemoval({ role: 'admin', activeBookingCount: 0 });
    assert.equal(adminDecision.allowed, true);
    if (adminDecision.allowed) {
      assert.equal(adminDecision.override, false);
    }
  });
});
