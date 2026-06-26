import assert from 'node:assert/strict';
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
