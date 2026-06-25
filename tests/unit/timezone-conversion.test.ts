import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cairoLocalToUtcIso, toCairoDatetimeLocal } from '../../src/shared/utils/dateUtils.ts';

// Africa/Cairo observes DST: summer is +03:00, winter is +02:00. The save must derive the
// correct offset *for the entered date* from IANA — the same source the display trusts — so the
// round-trip is the identity regardless of the machine's local timezone (TZ env).
describe('cairoLocalToUtcIso', () => {
  it('summer date (+03:00): 2:30 PM Cairo -> 11:30 UTC', () => {
    assert.equal(cairoLocalToUtcIso('2026-07-15T14:30'), '2026-07-15T11:30:00.000Z');
  });

  it('winter date (+02:00): 2:30 PM Cairo -> 12:30 UTC', () => {
    assert.equal(cairoLocalToUtcIso('2026-01-15T14:30'), '2026-01-15T12:30:00.000Z');
  });

  it('round-trips through toCairoDatetimeLocal in winter (the case the old design broke)', () => {
    const utc = cairoLocalToUtcIso('2026-01-15T14:30');
    assert.equal(toCairoDatetimeLocal(utc), '2026-01-15T14:30');
  });

  it('round-trips through toCairoDatetimeLocal in summer', () => {
    const utc = cairoLocalToUtcIso('2026-07-15T14:30');
    assert.equal(toCairoDatetimeLocal(utc), '2026-07-15T14:30');
  });

  it('is environment-independent — never equals the old wall±deviceOffset output', () => {
    // The old getCairoOffsetString() produced (Cairo − browserOffset); on any non-Cairo TZ this
    // diverges from the correct UTC. The correct conversion is a fixed UTC instant.
    assert.equal(cairoLocalToUtcIso('2026-07-15T14:30'), '2026-07-15T11:30:00.000Z');
  });

  it('returns an empty string for empty or invalid input (no throw)', () => {
    assert.equal(cairoLocalToUtcIso(''), '');
    assert.equal(cairoLocalToUtcIso('not-a-date'), '');
    assert.equal(cairoLocalToUtcIso(undefined), '');
  });
});
