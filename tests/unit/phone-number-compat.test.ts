import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizePhoneNumber,
  validatePhoneNumberUpdate,
} from '../../server/src/routes/api/users-phone.ts';

describe('phone number update validation', () => {
  it('allows legacy numbers when unchanged', () => {
    const existing = '0501234567';
    const incoming = normalizePhoneNumber('050 123-4567');
    const result = validatePhoneNumberUpdate({
      incomingNormalized: incoming,
      existing,
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.isUnchanged, true);
    }
  });

  it('requires E.164 when changing legacy numbers', () => {
    const existing = '0501234567';
    const incoming = normalizePhoneNumber('0501234568');
    const result = validatePhoneNumberUpdate({
      incomingNormalized: incoming,
      existing,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.message, 'Invalid phone number format');
    }
  });

  it('treats empty input as unset', () => {
    const incoming = normalizePhoneNumber('   ');
    const result = validatePhoneNumberUpdate({
      incomingNormalized: incoming,
      existing: null,
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.isUnchanged, true);
    }
  });
});
