import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isE164PhoneNumber,
  normalizePhoneNumber,
} from '../../server/src/routes/api/users-phone.ts';

describe('backend +20 leading-zero guard', () => {
  it('collapses +200 -> +20 for Egypt (drops the trunk zero)', () => {
    assert.equal(normalizePhoneNumber('+2001012345678'), '+201012345678');
  });

  it('leaves an already-correct Egyptian number unchanged', () => {
    assert.equal(normalizePhoneNumber('+201012345678'), '+201012345678');
  });

  it('does not touch other country codes', () => {
    assert.equal(normalizePhoneNumber('+971501234567'), '+971501234567');
  });

  it('still strips separators (regression)', () => {
    assert.equal(normalizePhoneNumber('+971 50 123-4567'), '+971501234567');
  });

  it('produces output that passes the E.164 gate', () => {
    assert.equal(isE164PhoneNumber(normalizePhoneNumber('+2001012345678')), true);
  });

  it('treats empty input as empty', () => {
    assert.equal(normalizePhoneNumber(''), '');
  });
});
