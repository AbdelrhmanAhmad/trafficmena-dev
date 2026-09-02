import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyEmail,
  maskEmail,
  maskPhone,
} from '../../server/src/services/notifications/contact.ts';

describe('notification privacy — masked destinations', () => {
  it('masked emails never contain full local part beyond the first char', () => {
    const emails = [
      'alice@example.com',
      'abdelrahman.hassan@trafficmena.com',
      'x@y.co',
      'VeryLongLocalPart123@domain.org',
    ];

    for (const email of emails) {
      const masked = maskEmail(email);
      assert.ok(masked);
      const at = email.indexOf('@');
      const local = email.slice(0, at);
      const domain = email.slice(at + 1);

      assert.equal(masked, `${local.slice(0, 1)}***@${domain}`);
      if (local.length > 1) {
        assert.ok(!masked.includes(local), `masked must not contain full local part: ${local}`);
      }
      assert.ok(masked.includes(domain));
    }
  });

  it('classifyEmail destinationMasked follows the same privacy rule', () => {
    const classified = classifyEmail('privacy.check@example.com');
    assert.equal(classified.status, 'deliverable');
    if (classified.status === 'deliverable') {
      assert.equal(classified.masked, 'p***@example.com');
      assert.ok(!classified.masked.includes('rivacy.check'));
    }
  });

  it('masked phones never expose the full number', () => {
    const phone = '+201012345678';
    const masked = maskPhone(phone);
    assert.ok(masked);
    assert.notEqual(masked, phone);
    assert.ok(masked.includes('****'));
    assert.ok(!masked.includes('01234567'));
  });
});
