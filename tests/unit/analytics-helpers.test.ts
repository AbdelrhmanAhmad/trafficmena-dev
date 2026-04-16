import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  centsToUnits,
  detectMeetingPlatform,
  getCustomerType,
  getCustomerTypeForPurchase,
  getPageType,
  normalizePhone,
} from '../../src/lib/analytics/helpers';

describe('getPageType', () => {
  it('maps known routes correctly', () => {
    assert.equal(getPageType('/'), 'homepage');
    assert.equal(getPageType('/about'), 'about');
    assert.equal(getPageType('/meetups'), 'event_list');
    assert.equal(getPageType('/meetups/abc-123'), 'event_detail');
    assert.equal(getPageType('/tracks/trk-456'), 'track_detail');
    assert.equal(getPageType('/subscribe'), 'subscribe_landing');
    assert.equal(getPageType('/dashboard/subscribe'), 'subscribe_landing');
    assert.equal(getPageType('/signin'), 'signin');
    assert.equal(getPageType('/signup/step-1'), 'signup');
    assert.equal(getPageType('/dashboard'), 'dashboard');
    assert.equal(getPageType('/dashboard/meetups'), 'dashboard_events');
    assert.equal(getPageType('/dashboard/library'), 'dashboard_library');
    assert.equal(getPageType('/dashboard/library/abc'), 'dashboard_library_detail');
    assert.equal(getPageType('/dashboard/library/tracks/trk-1'), 'dashboard_track_detail');
    assert.equal(getPageType('/dashboard/library/series/ser-1'), 'dashboard_series_detail');
    assert.equal(getPageType('/dashboard/calculators'), 'dashboard_calculators');
    assert.equal(getPageType('/dashboard/calculators/roas'), 'calculator_detail');
    assert.equal(getPageType('/dashboard/profile'), 'dashboard_profile');
    assert.equal(getPageType('/payment/success'), 'payment_success');
    assert.equal(getPageType('/payment/failed'), 'payment_failed');
    assert.equal(getPageType('/payment/pending'), 'payment_pending');
    assert.equal(getPageType('/thank-you-event/evt-1'), 'thank_you_event');
    assert.equal(getPageType('/thank-you-track/trk-1'), 'thank_you_track');
    assert.equal(getPageType('/privacy'), 'privacy');
    assert.equal(getPageType('/terms'), 'terms');
  });

  it('returns "other" for unknown paths', () => {
    assert.equal(getPageType('/unknown/page'), 'other');
    assert.equal(getPageType('/admin/settings'), 'other');
  });
});

describe('getCustomerType (global_variables)', () => {
  it('returns "free" for 0 purchases', () => {
    assert.equal(getCustomerType(0), 'free');
  });

  it('returns "new" for exactly 1 purchase', () => {
    assert.equal(getCustomerType(1), 'new');
  });

  it('returns "returning" for 2+ purchases', () => {
    assert.equal(getCustomerType(2), 'returning');
    assert.equal(getCustomerType(10), 'returning');
  });

  it('handles negative values as "free"', () => {
    assert.equal(getCustomerType(-1), 'free');
  });
});

describe('getCustomerTypeForPurchase (purchase events)', () => {
  it('returns "new" for 0 prior purchases', () => {
    assert.equal(getCustomerTypeForPurchase(0), 'new');
  });

  it('returns "returning" for 1+ prior purchases', () => {
    assert.equal(getCustomerTypeForPurchase(1), 'returning');
    assert.equal(getCustomerTypeForPurchase(5), 'returning');
  });
});

describe('centsToUnits', () => {
  it('converts cents to currency units', () => {
    assert.equal(centsToUnits(25000), 250);
    assert.equal(centsToUnits(150000), 1500);
    assert.equal(centsToUnits(5050), 50.5);
  });

  it('returns 0 for null/undefined', () => {
    assert.equal(centsToUnits(null), 0);
    assert.equal(centsToUnits(undefined), 0);
  });

  it('returns 0 for zero cents', () => {
    assert.equal(centsToUnits(0), 0);
  });
});

describe('detectMeetingPlatform', () => {
  it('detects Zoom', () => {
    assert.equal(detectMeetingPlatform('https://zoom.us/j/123456'), 'zoom');
    assert.equal(detectMeetingPlatform('https://us02web.zoom.us/j/123'), 'zoom');
  });

  it('detects Google Meet', () => {
    assert.equal(detectMeetingPlatform('https://meet.google.com/abc-defg-hij'), 'google_meet');
  });

  it('detects Microsoft Teams', () => {
    assert.equal(detectMeetingPlatform('https://teams.microsoft.com/l/meetup/123'), 'teams');
  });

  it('returns "other" for unknown URLs', () => {
    assert.equal(detectMeetingPlatform('https://custom-meeting.com/room'), 'other');
    assert.equal(detectMeetingPlatform(''), 'other');
  });
});

describe('normalizePhone', () => {
  it('strips non-digit characters', () => {
    assert.equal(normalizePhone('+201012345678'), '201012345678');
    assert.equal(normalizePhone('+20-101-234-5678'), '201012345678');
  });

  it('returns empty string for null/undefined', () => {
    assert.equal(normalizePhone(null), '');
    assert.equal(normalizePhone(undefined), '');
  });
});
