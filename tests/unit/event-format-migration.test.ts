import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  deriveLegacyEventFormat,
  isLiteralFormatText,
  type LegacyEventRow,
  legacyOnlineInference,
} from '../../server/src/utils/eventFormat.ts';

describe('event_format backfill intent', () => {
  it('maps a meeting link with no location to online (keeps location null)', () => {
    const decision = deriveLegacyEventFormat({
      meetingLink: 'https://zoom.us/j/123',
      location: null,
    });
    assert.deepEqual(decision, { format: 'online', clearLocation: false });
  });

  it('maps literal "online" location text to online and clears the text', () => {
    assert.deepEqual(deriveLegacyEventFormat({ meetingLink: null, location: 'online' }), {
      format: 'online',
      clearLocation: true,
    });
    // Case-insensitive + whitespace tolerant.
    assert.deepEqual(deriveLegacyEventFormat({ meetingLink: null, location: '  Online ' }), {
      format: 'online',
      clearLocation: true,
    });
  });

  it('maps literal "offline" location text to offline and clears the text', () => {
    assert.deepEqual(deriveLegacyEventFormat({ meetingLink: null, location: 'OFFLINE' }), {
      format: 'offline',
      clearLocation: true,
    });
  });

  it('keeps a real address as offline', () => {
    assert.deepEqual(deriveLegacyEventFormat({ meetingLink: null, location: 'Dubai, UAE' }), {
      format: 'offline',
      clearLocation: false,
    });
  });

  it('defaults an incomplete row (neither link nor location) to offline', () => {
    assert.deepEqual(deriveLegacyEventFormat({ meetingLink: null, location: null }), {
      format: 'offline',
      clearLocation: false,
    });
    assert.deepEqual(deriveLegacyEventFormat({ meetingLink: '', location: '' }), {
      format: 'offline',
      clearLocation: false,
    });
  });

  it('identifies literal delivery-mode text vs a real address', () => {
    assert.equal(isLiteralFormatText('online'), true);
    assert.equal(isLiteralFormatText('Offline'), true);
    assert.equal(isLiteralFormatText('Dubai, UAE'), false);
    assert.equal(isLiteralFormatText(null), false);
  });
});

describe('event_format pricing characterization (no silent flips)', () => {
  // The subscriber "free online" decision must be unchanged for rows where the old inference and the
  // new explicit format AGREE. This pins behavior before the six call sites are swapped.
  const agreeingRows: LegacyEventRow[] = [
    { meetingLink: 'https://zoom.us/j/1', location: null }, // online both ways
    { meetingLink: null, location: 'Dubai, UAE' }, // offline both ways
    { meetingLink: 'https://zoom.us/j/2', location: 'Cairo, EG' }, // hybrid text -> offline both ways
  ];

  for (const row of agreeingRows) {
    it(`agrees for ${JSON.stringify(row)}`, () => {
      const oldIsOnline = legacyOnlineInference(row);
      const newIsOnline = deriveLegacyEventFormat(row).format === 'online';
      assert.equal(newIsOnline, oldIsOnline);
    });
  }

  it('flags the intended correction: literal "online" text flips offline -> online', () => {
    const row: LegacyEventRow = { meetingLink: null, location: 'online' };
    // Old inference saw a non-empty location and called it offline (the bug).
    assert.equal(legacyOnlineInference(row), false);
    // New intent recognizes it as online (free for subscribers) — surfaced in the diff report.
    assert.equal(deriveLegacyEventFormat(row).format, 'online');
  });
});
