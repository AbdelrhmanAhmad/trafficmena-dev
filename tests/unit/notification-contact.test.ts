import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyPhone,
  isValidEmail,
  maskEmail,
  maskPhone,
  normalizeToE164,
} from '../../server/src/services/notifications/contact.ts';

describe('notification contact — maskEmail', () => {
  it('keeps first local char and full domain', () => {
    assert.equal(maskEmail('alice@example.com'), 'a***@example.com');
  });

  it('returns null for empty input', () => {
    assert.equal(maskEmail(null), null);
    assert.equal(maskEmail(''), null);
  });

  it('returns *** when @ is missing or leading', () => {
    assert.equal(maskEmail('not-an-email'), '***');
    assert.equal(maskEmail('@example.com'), '***');
  });
});

describe('notification contact — maskPhone', () => {
  it('masks middle digits of E.164 numbers', () => {
    const masked = maskPhone('+201012345678');
    assert.ok(masked);
    assert.match(masked, /^\+201\*+\d{4}$/);
    assert.ok(!masked.includes('123456'));
  });

  it('returns null for empty input', () => {
    assert.equal(maskPhone(null), null);
    assert.equal(maskPhone(''), null);
  });
});

describe('notification contact — isValidEmail', () => {
  it('accepts simple valid emails', () => {
    assert.equal(isValidEmail('user@example.com'), true);
    assert.equal(isValidEmail('  user@example.com  '), true);
  });

  it('rejects empty and malformed emails', () => {
    assert.equal(isValidEmail(null), false);
    assert.equal(isValidEmail(''), false);
    assert.equal(isValidEmail('no-at'), false);
    assert.equal(isValidEmail('a@b'), false);
    assert.equal(isValidEmail('@example.com'), false);
  });
});

describe('notification contact — phone normalize/classify', () => {
  it('normalizes valid E.164 phones', () => {
    assert.equal(normalizeToE164('+201012345678'), '+201012345678');
    assert.equal(normalizeToE164('+971 50 123-4567'), '+971501234567');
  });

  it('classifies valid E.164 as deliverable', () => {
    const result = classifyPhone('+201012345678');
    assert.equal(result.status, 'deliverable');
    if (result.status === 'deliverable') {
      assert.equal(result.value, '+201012345678');
      assert.ok(result.masked.includes('****'));
    }
  });

  it('classifies invalid phones as missing_or_invalid_phone', () => {
    for (const phone of ['', '  ', 'not-a-phone', '12345', '01012345678']) {
      const result = classifyPhone(phone || null);
      assert.equal(result.status, 'skip', `expected skip for ${JSON.stringify(phone)}`);
      if (result.status === 'skip') {
        assert.equal(result.reason, 'missing_or_invalid_phone');
      }
    }
  });
});
