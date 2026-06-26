import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isEgyptianMobileE164,
  toFawaterkLocalPhone,
} from '../../server/src/routes/api/users-phone.ts';

// Bug repro: we store phones as E.164 (+20...), but Fawaterk's mobile-wallet endpoint
// rejects +20 (verified HTTP 422) and requires the local MSISDN (01...). The fix converts
// only at the gateway boundary; canonical storage stays E.164.
describe('toFawaterkLocalPhone (E.164 -> Fawaterk local MSISDN)', () => {
  it('converts an Egyptian +20 number to local 01... format', () => {
    assert.equal(toFawaterkLocalPhone('+201127792366'), '01127792366');
    assert.equal(toFawaterkLocalPhone('+201012345678'), '01012345678');
  });

  it('is idempotent for an already-local number', () => {
    assert.equal(toFawaterkLocalPhone('01127792366'), '01127792366');
  });

  it('leaves a non-Egyptian E.164 number unchanged (only +20 is rewritten)', () => {
    assert.equal(toFawaterkLocalPhone('+971501234567'), '+971501234567');
  });
});

describe('isEgyptianMobileE164 (mobile-wallet eligibility guard)', () => {
  it('accepts valid +20 mobiles (10-digit local starting 10/11/12/15)', () => {
    for (const prefix of ['10', '11', '12', '15']) {
      assert.equal(isEgyptianMobileE164(`+20${prefix}12345678`), true);
    }
  });

  it('rejects a non-Egyptian number even when its tail resembles an Egyptian local part', () => {
    // Footgun guard: a naive slice('+20') of +971501234567 yields "1501234567" which would
    // pass the EG mobile rule. The +20-prefix check must run first.
    assert.equal(isEgyptianMobileE164('+971501234567'), false);
  });

  it('rejects +20 numbers with a bad prefix or wrong length', () => {
    assert.equal(isEgyptianMobileE164('+201312345678'), false); // bad prefix 13
    assert.equal(isEgyptianMobileE164('+2010123456'), false); // local part too short
  });
});
