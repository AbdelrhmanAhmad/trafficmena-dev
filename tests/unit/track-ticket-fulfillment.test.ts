import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filterLiveIncludedEvents } from '../../server/src/routes/api/ticketAccess.ts';

// A production-shaped hybrid track: 11 online sessions + 3 offline "closing day" sessions.
const sessions = [
  ...Array.from({ length: 11 }, (_, i) => ({
    eventId: `online-${i}`,
    eventFormat: 'online' as const,
  })),
  ...Array.from({ length: 3 }, (_, i) => ({
    eventId: `offline-${i}`,
    eventFormat: 'offline' as const,
  })),
];

describe('filterLiveIncludedEvents (which sessions a ticket registers into)', () => {
  it('online_only registers into the 11 online sessions only', () => {
    const included = filterLiveIncludedEvents(sessions, 'online_only');
    assert.equal(included.length, 11);
    assert.ok(included.every((s) => s.eventFormat === 'online'));
  });

  it('online_offline registers into all 14 sessions', () => {
    assert.equal(filterLiveIncludedEvents(sessions, 'online_offline').length, 14);
  });

  it('offline_only registers into the 3 offline sessions only', () => {
    const included = filterLiveIncludedEvents(sessions, 'offline_only');
    assert.equal(included.length, 3);
    assert.ok(included.every((s) => s.eventFormat === 'offline'));
  });

  it('a legacy booking (no ticket type) registers into every session', () => {
    assert.equal(filterLiveIncludedEvents(sessions, null).length, 14);
    assert.equal(filterLiveIncludedEvents(sessions, undefined).length, 14);
  });

  it('keeps offline-event capacity independent of online_only buyers', () => {
    // online_only never selects an offline session, so it cannot consume an offline seat.
    const offlineSelected = filterLiveIncludedEvents(sessions, 'online_only').filter(
      (s) => s.eventFormat === 'offline',
    );
    assert.equal(offlineSelected.length, 0);
  });
});
