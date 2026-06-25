import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assembleE164,
  normalizeLocalPart,
  parseE164,
  validateLocalPart,
} from '../../src/shared/utils/phone.ts';

describe('Egypt phone normalization', () => {
  it('strips a single leading zero for Egypt and assembles E.164', () => {
    const local = normalizeLocalPart('01012345678', '20');
    assert.equal(local, '1012345678');
    assert.equal(assembleE164('20', local), '+201012345678');
  });

  it('leaves an already-normalized Egyptian number unchanged', () => {
    const local = normalizeLocalPart('1012345678', '20');
    assert.equal(assembleE164('20', local), '+201012345678');
  });

  it('accepts the valid Egyptian prefixes 10/11/12/15', () => {
    for (const prefix of ['10', '11', '12', '15']) {
      assert.equal(validateLocalPart(`${prefix}12345678`, '20'), null);
    }
  });

  it('rejects an invalid Egyptian prefix', () => {
    assert.ok(validateLocalPart(normalizeLocalPart('1312345678', '20'), '20'));
  });

  it('rejects the wrong length', () => {
    assert.ok(validateLocalPart(normalizeLocalPart('101234567', '20'), '20')); // 9 digits
    assert.ok(validateLocalPart(normalizeLocalPart('10123456789', '20'), '20')); // 11 digits
  });

  it('does not strip the leading zero for non-Egypt countries', () => {
    const local = normalizeLocalPart('0501234567', '971');
    assert.equal(local, '0501234567');
    assert.equal(assembleE164('971', local), '+9710501234567');
  });

  it('digit-strips pasted values with spaces and dashes', () => {
    assert.equal(normalizeLocalPart('010 1234-5678', '20'), '1012345678');
  });

  it('parses a stored Egyptian E.164 into selector code + local part', () => {
    assert.deepEqual(parseE164('+201012345678'), { code: 'EG', local: '1012345678' });
  });
});
