import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  payments,
  ticketTypeEnum,
  trackBookings,
  tracks,
} from '../../server/src/db/schema/index.ts';

describe('ticket_type data model', () => {
  it('exposes the three ticket variants in order', () => {
    assert.deepEqual(ticketTypeEnum.enumValues, ['online_only', 'online_offline', 'offline_only']);
  });

  it('adds the three nullable per-ticket price columns to tracks', () => {
    assert.ok(tracks.onlineOnlyPriceCents, 'online_only_price_cents missing');
    assert.ok(tracks.onlineOfflinePriceCents, 'online_offline_price_cents missing');
    assert.ok(tracks.offlineOnlyPriceCents, 'offline_only_price_cents missing');
    // Nullable (opt-in): a track with all three null stays on the legacy single-price path.
    assert.equal(tracks.onlineOnlyPriceCents.notNull, false);
    assert.equal(tracks.onlineOfflinePriceCents.notNull, false);
    assert.equal(tracks.offlineOnlyPriceCents.notNull, false);
  });

  it('adds a nullable ticket_type to payments (fulfillment source) and track_bookings (durable record)', () => {
    assert.ok(payments.ticketType, 'payments.ticket_type missing');
    assert.ok(trackBookings.ticketType, 'track_bookings.ticket_type missing');
    assert.equal(payments.ticketType.notNull, false);
    assert.equal(trackBookings.ticketType.notNull, false);
  });
});
