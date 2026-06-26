import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

// Regression: disabling a ticket type must persist. The admin form sends a null price for a disabled
// variant (null = disabled, 0 = enabled & free). priceInCentsSchema is a union of a coercing number
// and null. z.coerce.number() greedily coerces null -> Number(null) === 0, so if it is tried FIRST a
// disabled ticket is stored as 0 (enabled, free) and reappears on the public page as "Free". The
// null branch must come first so null input stays null.
//
// (tracks.ts imports the DB client, so it can't be imported here — assert the source ordering, the
// same convention as track-ticket-config-validation.test.ts.)

describe('ticket-type disable persistence (price schema null handling)', () => {
  it('orders the null branch before z.coerce.number() so a disabled price stays null', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/tracks.ts', import.meta.url),
      'utf8',
    );
    const schemaStart = source.indexOf('const priceInCentsSchema = z');
    assert.ok(schemaStart >= 0, 'priceInCentsSchema not found');
    const schemaEnd = source.indexOf('.optional()', schemaStart);
    const unionBody = source.slice(schemaStart, schemaEnd);

    const nullIdx = unionBody.indexOf('z.null()');
    const coerceIdx = unionBody.indexOf('z.coerce.number()');
    assert.ok(nullIdx >= 0, 'union must include z.null()');
    assert.ok(coerceIdx >= 0, 'union must include z.coerce.number()');
    assert.ok(
      nullIdx < coerceIdx,
      'z.null() must precede z.coerce.number() — otherwise null is coerced to 0 (enabled free)',
    );
  });
});
