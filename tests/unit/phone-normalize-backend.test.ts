import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isE164PhoneNumber,
  normalizePhoneNumber,
  validatePhoneNumberUpdate,
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

describe('backend validatePhoneNumberUpdate Egyptian rule', () => {
  const update = (incoming: string) =>
    validatePhoneNumberUpdate({ incomingNormalized: incoming, existing: null });

  it('accepts a valid +20 mobile (10 digits starting 10/11/12/15)', () => {
    for (const prefix of ['10', '11', '12', '15']) {
      const result = update(`+20${prefix}12345678`);
      assert.equal(result.ok, true, `expected +20${prefix}12345678 to be accepted`);
    }
  });

  it('rejects a +20 number with a bad prefix (+2013…)', () => {
    const result = update('+201312345678');
    assert.equal(result.ok, false);
  });

  it('rejects a wrong-length +20 number', () => {
    assert.equal(update('+2010123456').ok, false); // 8-digit local
    assert.equal(update('+2010123456789').ok, false); // 11-digit local
  });

  it('still accepts a well-formed non-Egypt E.164 number', () => {
    assert.equal(update('+971501234567').ok, true);
  });
});
