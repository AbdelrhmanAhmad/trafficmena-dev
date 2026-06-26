import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveTrackBasePrice } from '../../server/src/routes/api/ticketAccess.ts';

const ticketTypedTrack = {
  priceInCents: 99_999, // legacy column ignored once ticket types exist
  onlineOnlyPriceCents: 40_000,
  onlineOfflinePriceCents: 60_000,
  offlineOnlyPriceCents: null, // offline_only NOT offered
};

const legacyTrack = {
  priceInCents: 50_000,
  onlineOnlyPriceCents: null,
  onlineOfflinePriceCents: null,
  offlineOnlyPriceCents: null,
};

describe('resolveTrackBasePrice (checkout pricing decision)', () => {
  it('requires a ticket type when the track is configured', () => {
    assert.deepEqual(resolveTrackBasePrice(ticketTypedTrack, null), {
      ok: false,
      reason: 'ticket_type_required',
    });
    assert.deepEqual(resolveTrackBasePrice(ticketTypedTrack, undefined), {
      ok: false,
      reason: 'ticket_type_required',
    });
  });

  it('rejects a disabled ticket type', () => {
    assert.deepEqual(resolveTrackBasePrice(ticketTypedTrack, 'offline_only'), {
      ok: false,
      reason: 'ticket_type_disabled',
    });
  });

  it('prices an enabled variant (ignoring the legacy single price)', () => {
    assert.deepEqual(resolveTrackBasePrice(ticketTypedTrack, 'online_only'), {
      ok: true,
      basePrice: 40_000,
    });
    assert.deepEqual(resolveTrackBasePrice(ticketTypedTrack, 'online_offline'), {
      ok: true,
      basePrice: 60_000,
    });
  });

  it('treats an enabled free variant as basePrice 0', () => {
    const freeOnline = { ...ticketTypedTrack, onlineOnlyPriceCents: 0 };
    assert.deepEqual(resolveTrackBasePrice(freeOnline, 'online_only'), {
      ok: true,
      basePrice: 0,
    });
  });

  it('falls back to the legacy single price for a non-ticket-typed track', () => {
    // A ticketType passed for a legacy track is ignored — the single price still applies.
    assert.deepEqual(resolveTrackBasePrice(legacyTrack, null), { ok: true, basePrice: 50_000 });
    assert.deepEqual(resolveTrackBasePrice(legacyTrack, 'online_only'), {
      ok: true,
      basePrice: 50_000,
    });
  });

  it('treats a legacy track with no price as free', () => {
    assert.deepEqual(resolveTrackBasePrice({ ...legacyTrack, priceInCents: null }, null), {
      ok: true,
      basePrice: 0,
    });
  });
});
