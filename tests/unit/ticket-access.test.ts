import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canAccessRecording,
  type EventFormat,
  enabledTicketTypes,
  getTrackTicketPrice,
  hasTicketTypes,
  isTicketEnabled,
  liveIncludedFormats,
  resolveTicketAccess,
  type TicketType,
} from '../../server/src/routes/api/ticketAccess.ts';

// Canonical matrix: [canAttendLive, canAccessRecording] per (ticketType, eventFormat).
const MATRIX: Record<TicketType, Record<EventFormat, [boolean, boolean]>> = {
  online_only: { online: [true, true], offline: [false, true] },
  online_offline: { online: [true, true], offline: [true, true] },
  offline_only: { online: [false, false], offline: [true, true] },
};

describe('resolveTicketAccess matrix', () => {
  for (const ticketType of Object.keys(MATRIX) as TicketType[]) {
    for (const eventFormat of ['online', 'offline'] as EventFormat[]) {
      const [live, recording] = MATRIX[ticketType][eventFormat];
      it(`${ticketType} + ${eventFormat} -> live=${live}, recording=${recording}`, () => {
        assert.deepEqual(resolveTicketAccess(ticketType, eventFormat), {
          canAttendLive: live,
          canAccessRecording: recording,
        });
      });
    }
  }

  it('grants offline recordings to all three ticket types', () => {
    assert.equal(resolveTicketAccess('online_only', 'offline').canAccessRecording, true);
    assert.equal(resolveTicketAccess('online_offline', 'offline').canAccessRecording, true);
    assert.equal(resolveTicketAccess('offline_only', 'offline').canAccessRecording, true);
  });

  it('denies online-session recordings to offline_only', () => {
    assert.equal(resolveTicketAccess('offline_only', 'online').canAccessRecording, false);
  });
});

describe('canAccessRecording with null event (general track content)', () => {
  it('follows the offline rule -> all three ticket types can access', () => {
    assert.equal(canAccessRecording('online_only', null), true);
    assert.equal(canAccessRecording('online_offline', null), true);
    assert.equal(canAccessRecording('offline_only', null), true);
  });

  it('still gates online recordings when an event format is known', () => {
    assert.equal(canAccessRecording('offline_only', 'online'), false);
    assert.equal(canAccessRecording('online_only', 'online'), true);
  });
});

describe('liveIncludedFormats partitions (11 / 14 / 3)', () => {
  it('online_only -> online sessions only', () => {
    assert.deepEqual(liveIncludedFormats('online_only'), ['online']);
  });
  it('online_offline -> both', () => {
    assert.deepEqual(liveIncludedFormats('online_offline'), ['online', 'offline']);
  });
  it('offline_only -> offline sessions only', () => {
    assert.deepEqual(liveIncludedFormats('offline_only'), ['offline']);
  });
});

describe('track ticket pricing + configuration', () => {
  const noTicketTypes = {
    onlineOnlyPriceCents: null,
    onlineOfflinePriceCents: null,
    offlineOnlyPriceCents: null,
  };

  it('treats a track with all null price columns as not configured', () => {
    assert.equal(hasTicketTypes(noTicketTypes), false);
    assert.equal(isTicketEnabled(noTicketTypes, 'online_only'), false);
    assert.equal(getTrackTicketPrice(noTicketTypes, 'online_only'), null);
    assert.deepEqual(enabledTicketTypes(noTicketTypes), []);
  });

  it('marks exactly the priced variant as enabled', () => {
    const track = {
      onlineOnlyPriceCents: 50_000,
      onlineOfflinePriceCents: null,
      offlineOnlyPriceCents: 30_000,
    };
    assert.equal(hasTicketTypes(track), true);
    assert.equal(isTicketEnabled(track, 'online_only'), true);
    assert.equal(isTicketEnabled(track, 'online_offline'), false);
    assert.equal(isTicketEnabled(track, 'offline_only'), true);
    assert.equal(getTrackTicketPrice(track, 'online_only'), 50_000);
    assert.equal(getTrackTicketPrice(track, 'online_offline'), null);
    assert.deepEqual(enabledTicketTypes(track), ['online_only', 'offline_only']);
  });

  it('treats price 0 as enabled-and-free, not disabled', () => {
    const freeOnline = {
      onlineOnlyPriceCents: 0,
      onlineOfflinePriceCents: null,
      offlineOnlyPriceCents: null,
    };
    assert.equal(isTicketEnabled(freeOnline, 'online_only'), true);
    assert.equal(getTrackTicketPrice(freeOnline, 'online_only'), 0);
    assert.equal(hasTicketTypes(freeOnline), true);
  });
});
