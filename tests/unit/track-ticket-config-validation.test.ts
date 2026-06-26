import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import {
  hasTicketTypes,
  isTicketEnabled,
  ticketEventCoverageError,
} from '../../server/src/routes/api/ticketAccess.ts';

const allNull = {
  onlineOnlyPriceCents: null,
  onlineOfflinePriceCents: null,
  offlineOnlyPriceCents: null,
};

describe('track ticket-type configuration', () => {
  it('treats price 0 as enabled (free) and null as disabled', () => {
    const track = { ...allNull, onlineOnlyPriceCents: 0 };
    assert.equal(isTicketEnabled(track, 'online_only'), true);
    assert.equal(isTicketEnabled(track, 'offline_only'), false);
    assert.equal(hasTicketTypes(track), true);
  });

  it('treats an all-null track as not using ticket types (legacy)', () => {
    assert.equal(hasTicketTypes(allNull), false);
  });
});

describe('publish-time event coverage guard', () => {
  const fullCoverage = { hasOnlineEvent: true, hasOfflineEvent: true };

  it('passes when enabled tickets have matching sessions', () => {
    const hybrid = {
      onlineOnlyPriceCents: 40_000,
      onlineOfflinePriceCents: 60_000,
      offlineOnlyPriceCents: 30_000,
    };
    assert.equal(ticketEventCoverageError(hybrid, fullCoverage), null);
  });

  it('rejects an offline ticket on a track with no offline session', () => {
    const offlineSold = { ...allNull, offlineOnlyPriceCents: 30_000 };
    const error = ticketEventCoverageError(offlineSold, {
      hasOnlineEvent: true,
      hasOfflineEvent: false,
    });
    assert.match(error ?? '', /offline/i);
  });

  it('rejects an online ticket on a track with no online session', () => {
    const onlineSold = { ...allNull, onlineOnlyPriceCents: 40_000 };
    const error = ticketEventCoverageError(onlineSold, {
      hasOnlineEvent: false,
      hasOfflineEvent: true,
    });
    assert.match(error ?? '', /online/i);
  });

  it('requires both formats for an online_offline ticket', () => {
    const both = { ...allNull, onlineOfflinePriceCents: 60_000 };
    assert.equal(
      ticketEventCoverageError(both, { hasOnlineEvent: true, hasOfflineEvent: false }) !== null,
      true,
    );
    assert.equal(ticketEventCoverageError(both, fullCoverage), null);
  });

  it('is a no-op for legacy (no ticket types) tracks', () => {
    assert.equal(
      ticketEventCoverageError(allNull, { hasOnlineEvent: false, hasOfflineEvent: false }),
      null,
    );
  });
});

describe('track ticket-type route wiring', () => {
  it('rejects ticket-configured tracks from the legacy free-book endpoint', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/tracks.ts', import.meta.url),
      'utf8',
    );
    const freeBookRoute = source.indexOf("'/tracks/:id/book'");
    const rejectTicketedTrack = source.indexOf(
      'hasTicketTypes(track) || isPaidTrack',
      freeBookRoute,
    );
    const bookingWrite = source.indexOf('executeTrackBookingWrite(tx, {', freeBookRoute);

    assert.ok(freeBookRoute >= 0);
    assert.ok(rejectTicketedTrack > freeBookRoute);
    assert.ok(bookingWrite > rejectTicketedTrack);
  });

  it('marks auto-linked recordings premium when any ticket variant is paid', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/tracks.ts', import.meta.url),
      'utf8',
    );
    const addEventsRoute = source.indexOf("'/tracks/:id/events'");
    const paidHelper = source.indexOf('isPaidTrackOffering(track)', addEventsRoute);
    const premiumUpdate = source.indexOf('set({ isPremium: true', paidHelper);

    assert.ok(addEventsRoute >= 0);
    assert.ok(paidHelper > addEventsRoute);
    assert.ok(premiumUpdate > paidHelper);
  });

  it('checks ticket coverage before removing events from a published ticketed track', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/tracks.ts', import.meta.url),
      'utf8',
    );
    const removeRoute = source.indexOf("'/tracks/:id/events/:eventId'");
    const coverageCheck = source.indexOf('ticketEventCoverageError(track', removeRoute);
    const deleteEvent = source.indexOf('.delete(trackEvents)', removeRoute);

    assert.ok(removeRoute >= 0);
    assert.ok(coverageCheck > removeRoute);
    assert.ok(deleteEvent > coverageCheck);
  });

  it('rejects direct event registration for sessions in ticket-configured tracks', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/events.ts', import.meta.url),
      'utf8',
    );
    const registerRoute = source.indexOf("'/events/:id/register'");
    const ticketColumns = source.indexOf(
      'onlineOnlyPriceCents: tracks.onlineOnlyPriceCents',
      registerRoute,
    );
    const ticketGuard = source.indexOf('hasTicketTypes(trackEvent)', registerRoute);
    const paymentRequired = source.indexOf("'PAYMENT_REQUIRED'", ticketGuard);
    const freeInsert = source.indexOf('tx.insert(eventAttendees)', registerRoute);

    assert.ok(registerRoute >= 0);
    assert.ok(ticketColumns > registerRoute);
    assert.ok(ticketGuard > ticketColumns);
    assert.ok(paymentRequired > ticketGuard);
    assert.ok(freeInsert > paymentRequired);
  });
});
