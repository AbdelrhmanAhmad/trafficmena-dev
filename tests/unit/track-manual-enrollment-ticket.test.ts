import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

// The manual-enrollment route reuses the tested pure helpers (resolveTrackBasePrice for the
// variant-price default + required/disabled validation; executeTrackBookingWrite for ticket-scoped
// session registration). These wiring assertions guard that those reuses stay in place without a DB.
async function readSource(relative: string): Promise<string> {
  return readFile(new URL(relative, import.meta.url), 'utf8');
}

describe('manual enrollment ticket-type wiring', () => {
  it('accepts a ticketType in the request schema', async () => {
    const source = await readSource('../../server/src/routes/api/trackEnrollments.ts');
    const schema = source.indexOf('manualEnrollmentSchema');
    const ticketField = source.indexOf('ticketType: z.enum(', schema);
    assert.ok(schema >= 0);
    assert.ok(ticketField > schema);
  });

  it('defaults the amount to the variant base price via resolveTrackBasePrice', async () => {
    const source = await readSource('../../server/src/routes/api/trackEnrollments.ts');
    assert.ok(source.includes("import { resolveTrackBasePrice } from './ticketAccess.js'"));
    // Default amount falls back to the resolved variant/legacy base price when no override is given.
    assert.ok(source.includes('parsed.data.amountPaidCents ?? baseResult.basePrice'));
  });

  it('rejects a configured track with no/disabled ticket type', async () => {
    const source = await readSource('../../server/src/routes/api/trackEnrollments.ts');
    assert.ok(source.includes('return { type: baseResult.reason }'));
    assert.ok(source.includes('TICKET_TYPE_REQUIRED'));
    assert.ok(source.includes('TICKET_TYPE_DISABLED'));
  });

  it('passes the ticket type into executeTrackBookingWrite', async () => {
    const source = await readSource('../../server/src/routes/api/trackEnrollments.ts');
    const writeCall = source.indexOf('executeTrackBookingWrite(tx, {');
    const ticketArg = source.indexOf('ticketType: parsed.data.ticketType ?? null', writeCall);
    assert.ok(writeCall >= 0);
    assert.ok(ticketArg > writeCall);
  });

  it('fulfillment filters sessions by ticket type before capacity + attendee writes', async () => {
    const source = await readSource('../../server/src/routes/api/trackBookingShared.ts');
    const filterCall = source.indexOf(
      'filterLiveIncludedEvents(allTrackEventRows, params.ticketType)',
    );
    const capacityCheck = source.indexOf('CAPACITY_NOT_SET', filterCall);
    const attendeeInsert = source.indexOf('insert(eventAttendees)', filterCall);
    assert.ok(filterCall >= 0, 'live-included filter missing');
    assert.ok(capacityCheck > filterCall, 'capacity checked before filtering');
    assert.ok(attendeeInsert > filterCall, 'attendees inserted before filtering');
  });
});
