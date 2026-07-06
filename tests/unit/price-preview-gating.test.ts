import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getEventPricePreviewGate } from '../../src/features/events/utils/eventPricePreviewGate.ts';
import { getTrackPricePreviewGate } from '../../src/features/tracks/utils/trackPricePreviewGate.ts';

describe('track price-preview gate', () => {
  const loadedLegacy = {
    signedIn: true,
    hasItemId: true,
    trackLoaded: true,
    userHasBooked: false,
    usesTicketTypes: false,
    selectedTicketType: null,
  };

  it('does not fire while the track is still loading (reproduces the 400 storm)', () => {
    // With the track undefined, ticket state is unknown; firing here sends a request with no
    // ticketType and 400s TICKET_TYPE_REQUIRED — the exact production race.
    assert.deepEqual(
      getTrackPricePreviewGate({
        ...loadedLegacy,
        trackLoaded: false,
        usesTicketTypes: true,
        selectedTicketType: 'online_only',
      }),
      { enabled: false, ticketType: undefined },
    );
    // Even a legacy (no-ticket) track must not fire before it loads.
    assert.equal(getTrackPricePreviewGate({ ...loadedLegacy, trackLoaded: false }).enabled, false);
  });

  it('fires without a ticketType for a loaded legacy single-price track', () => {
    assert.deepEqual(getTrackPricePreviewGate(loadedLegacy), {
      enabled: true,
      ticketType: undefined,
    });
  });

  it('waits for a ticket selection on a ticketed track, then fires with it', () => {
    const ticketed = { ...loadedLegacy, usesTicketTypes: true };
    assert.equal(
      getTrackPricePreviewGate({ ...ticketed, selectedTicketType: null }).enabled,
      false,
    );
    assert.deepEqual(
      getTrackPricePreviewGate({ ...ticketed, selectedTicketType: 'online_offline' }),
      { enabled: true, ticketType: 'online_offline' },
    );
  });

  it('does not fire when the user already holds the track (ticketed and legacy)', () => {
    assert.equal(getTrackPricePreviewGate({ ...loadedLegacy, userHasBooked: true }).enabled, false);
    assert.equal(
      getTrackPricePreviewGate({
        ...loadedLegacy,
        userHasBooked: true,
        usesTicketTypes: true,
        selectedTicketType: 'offline_only',
      }).enabled,
      false,
    );
  });

  it('does not fire for a signed-out user', () => {
    assert.equal(getTrackPricePreviewGate({ ...loadedLegacy, signedIn: false }).enabled, false);
  });
});

describe('event price-preview gate', () => {
  const loadedStandalone = {
    signedIn: true,
    hasItemId: true,
    eventLoaded: true,
    attending: false,
    isTrackEvent: false,
    hasSingleBookingStart: false,
  };

  it('does not fire while the event is still loading', () => {
    // event undefined ⇒ isTrackEvent reads false, so the old gate fired and 400d
    // INDIVIDUAL_BOOKING_DISABLED once the event resolved as a track event.
    assert.equal(getEventPricePreviewGate({ ...loadedStandalone, eventLoaded: false }), false);
  });

  it('fires for a loaded standalone event', () => {
    assert.equal(getEventPricePreviewGate(loadedStandalone), true);
  });

  it('gates track-bound events on single-booking availability', () => {
    assert.equal(getEventPricePreviewGate({ ...loadedStandalone, isTrackEvent: true }), false);
    assert.equal(
      getEventPricePreviewGate({
        ...loadedStandalone,
        isTrackEvent: true,
        hasSingleBookingStart: true,
      }),
      true,
    );
  });

  it('does not fire when the user is already attending', () => {
    assert.equal(getEventPricePreviewGate({ ...loadedStandalone, attending: true }), false);
  });

  it('does not fire for a signed-out user', () => {
    assert.equal(getEventPricePreviewGate({ ...loadedStandalone, signedIn: false }), false);
  });
});
