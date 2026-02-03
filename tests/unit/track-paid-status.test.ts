import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isPaidTrack } from '../../server/src/routes/api/trackPaidStatus.ts';

describe('track paid status', () => {
  it('returns true for positive prices', () => {
    assert.equal(isPaidTrack(100), true);
  });

  it('returns false for zero or null prices', () => {
    assert.equal(isPaidTrack(0), false);
    assert.equal(isPaidTrack(null), false);
  });

  it('returns false when price is undefined', () => {
    assert.equal(isPaidTrack(undefined), false);
  });
});
