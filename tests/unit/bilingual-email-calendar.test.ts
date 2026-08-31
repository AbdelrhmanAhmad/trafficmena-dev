import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getEventRegistrationEmailCopy,
  getOtpEmailCopy,
  getTrackRegistrationEmailCopy,
} from '../../server/src/i18n/emailCopy.js';
import { getSubscriptionBenefits } from '../../server/src/i18n/subscriptionCopy.js';

describe('email copy localization', () => {
  it('returns Arabic OTP copy', () => {
    const copy = getOtpEmailCopy('ar', '123456', 10);
    assert.match(copy.subject, /TrafficMENA/);
    assert.match(copy.body, /10/);
  });

  it('returns English registration confirmation copy', () => {
    const copy = getEventRegistrationEmailCopy('en', 'Growth Summit');
    assert.match(copy.subject, /Growth Summit/);
    assert.match(copy.headline, /registered/i);
  });

  it('returns Arabic registration confirmation copy', () => {
    const copy = getEventRegistrationEmailCopy('ar', 'قمة النمو');
    assert.match(copy.subject, /قمة النمو/);
    assert.match(copy.headline, /تأكيد/);
  });

  it('returns Arabic track registration copy', () => {
    const copy = getTrackRegistrationEmailCopy('ar', 'مسار التسويق', 3);
    assert.match(copy.intro, /3/);
    assert.match(copy.googleCalendar, /Google Calendar/);
  });
});

describe('subscription benefits localization', () => {
  it('localizes benefit strings', () => {
    const en = getSubscriptionBenefits('en', 20);
    const ar = getSubscriptionBenefits('ar', 20);
    assert.equal(en.length, 4);
    assert.equal(ar.length, 4);
    assert.match(en[0], /online events/i);
    assert.match(ar[0], /الإنترنت/);
  });
});
