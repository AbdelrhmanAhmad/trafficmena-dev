import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  getPendingEventContext,
  storePendingEventContext,
} from '../../src/shared/utils/eventRedirectUtils.ts';
import { getPostSignupRedirectUrl } from '../../src/shared/utils/postSignupRedirect.ts';
import {
  getPendingTrackContext,
  storePendingTrackContext,
} from '../../src/shared/utils/trackRedirectUtils.ts';

const installLocalStorageMock = () => {
  const store = new Map<string, string>();
  const mock = {
    getItem: (key) => (store.has(key) ? (store.get(key) ?? null) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: mock,
    configurable: true,
  });
};

beforeEach(() => {
  installLocalStorageMock();
});

describe('post signup redirect', () => {
  it('redirects paid event signups back to the event with checkout open', () => {
    storePendingEventContext({
      eventId: 'evt-123',
      eventTitle: 'Paid Event',
      eventDate: '2026-02-02T10:00:00.000Z',
      redirectUrl: '/meetups/evt-123',
      requiresPayment: true,
    });

    const redirectUrl = getPostSignupRedirectUrl();

    assert.equal(redirectUrl, '/meetups/evt-123?checkout=1');
    assert.equal(getPendingEventContext(), null);
  });

  it('redirects free event signups to the thank-you page', () => {
    storePendingEventContext({
      eventId: 'evt-456',
      eventTitle: 'Free Event',
      eventDate: '2026-02-03T12:00:00.000Z',
      redirectUrl: '/meetups/evt-456',
      requiresPayment: false,
    });

    const redirectUrl = getPostSignupRedirectUrl();

    assert.equal(redirectUrl, '/thank-you-event/evt-456');
    assert.equal(getPendingEventContext(), null);
  });

  it('redirects paid track signups back to the track with checkout open', () => {
    storePendingTrackContext({
      trackId: 'track-123',
      trackTitle: 'Paid Track',
      redirectUrl: '/tracks/track-123',
      requiresPayment: true,
    });

    const redirectUrl = getPostSignupRedirectUrl();

    assert.equal(redirectUrl, '/tracks/track-123?checkout=1');
    assert.equal(getPendingTrackContext(), null);
  });

  it('redirects free track signups to the thank-you page', () => {
    storePendingTrackContext({
      trackId: 'track-456',
      trackTitle: 'Free Track',
      redirectUrl: '/tracks/track-456',
      requiresPayment: false,
    });

    const redirectUrl = getPostSignupRedirectUrl();

    assert.equal(redirectUrl, '/thank-you-track/track-456');
    assert.equal(getPendingTrackContext(), null);
  });
});
