import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  generateEmailChangeOtp,
  hashEmailChangeCurrentOtp,
  hashEmailChangeOtp,
  maskEmail,
  safeCompareHex,
} from '../../server/src/routes/api/emailChangeLogic.ts';

describe('email change OTP logic', () => {
  it('generates a 6-digit numeric OTP', () => {
    for (let i = 0; i < 100; i++) {
      assert.match(generateEmailChangeOtp(), /^\d{6}$/);
    }
  });

  it('hashes deterministically and binds to secret + user + email + otp', () => {
    const base = hashEmailChangeOtp('secret', 'u1', 'a@b.com', '123456');
    assert.equal(base, hashEmailChangeOtp('secret', 'u1', 'a@b.com', '123456'));
    assert.notEqual(base, hashEmailChangeOtp('secret', 'u1', 'a@b.com', '654321')); // otp
    assert.notEqual(base, hashEmailChangeOtp('secret', 'u2', 'a@b.com', '123456')); // user
    assert.notEqual(base, hashEmailChangeOtp('secret', 'u1', 'c@d.com', '123456')); // email
    assert.notEqual(base, hashEmailChangeOtp('other', 'u1', 'a@b.com', '123456')); // secret
  });

  it('normalizes email case in the hash so storage/lookup match', () => {
    assert.equal(
      hashEmailChangeOtp('secret', 'u1', 'A@B.com', '123456'),
      hashEmailChangeOtp('secret', 'u1', 'a@b.com', '123456'),
    );
  });

  it('safeCompareHex matches identical hashes and rejects mismatches/empty/length-diff', () => {
    const h = hashEmailChangeOtp('secret', 'u1', 'a@b.com', '123456');
    assert.equal(safeCompareHex(h, h), true);
    assert.equal(safeCompareHex(h, hashEmailChangeOtp('secret', 'u1', 'a@b.com', '000000')), false);
    assert.equal(safeCompareHex(h, ''), false);
    assert.equal(safeCompareHex(h, 'abc'), false);
  });

  it('masks the local part of an email but keeps the domain', () => {
    assert.equal(maskEmail('alice@example.com'), 'a****@example.com');
    assert.match(maskEmail('ab@x.com'), /^a\*+@x\.com$/);
    assert.equal(maskEmail('not-an-email'), '***');
  });

  it('hashes current-email OTP separately from new-email OTP', () => {
    const current = hashEmailChangeCurrentOtp('secret', 'u1', 'old@b.com', '123456');
    const next = hashEmailChangeOtp('secret', 'u1', 'new@b.com', '123456');
    assert.notEqual(current, next);
    assert.equal(
      current,
      hashEmailChangeCurrentOtp('secret', 'u1', 'OLD@b.com', '123456'),
    );
  });
});
