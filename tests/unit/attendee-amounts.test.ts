import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { eventAttendees, trackBookings } from '../../server/src/db/schema/index.ts';
import {
  attendeeAmountCents,
  trackAttendeeSelection,
} from '../../server/src/utils/attendeesQuery.ts';

// Render a drizzle SQL expression to a lowercased string by walking its query chunks.
// Avoids importing drizzle-orm directly (a server-only dependency, unresolvable from tests/).
function renderSql(sqlExpr) {
  const parts = [];
  for (const chunk of sqlExpr?.queryChunks ?? []) {
    if (Array.isArray(chunk?.value)) {
      parts.push(chunk.value.join('')); // StringChunk
    } else if (typeof chunk?.name === 'string') {
      parts.push(chunk.name); // Column -> DB column name
    } else if (chunk?.value !== undefined) {
      parts.push(String(chunk.value)); // Param
    }
  }
  return parts.join('').toLowerCase();
}

describe('attendee amount query shape', () => {
  it('track amount = COALESCE(pricePaidCents, payments.amountCents, 0) so confirmed-free rows are 0', () => {
    const rendered = renderSql(attendeeAmountCents(trackBookings.pricePaidCents));
    assert.match(rendered, /coalesce/);
    assert.match(rendered, /price_paid_cents/);
    assert.match(rendered, /amount_cents/);
    // Final fallback to 0 -> free registrations surface as "Free" (not "—") in the UI.
    assert.match(rendered, /,\s*0\)/);
  });

  it('event amount uses the event-attendee price column with the same payment fallback', () => {
    const rendered = renderSql(attendeeAmountCents(eventAttendees.pricePaidCents));
    assert.match(rendered, /coalesce/);
    assert.match(rendered, /price_paid_cents/);
    assert.match(rendered, /amount_cents/);
  });

  it('track attendee selection keeps every original field and appends amountPaidCents + ticketType (regression guard)', () => {
    assert.deepEqual(Object.keys(trackAttendeeSelection), [
      'userId',
      'email',
      'name',
      'firstName',
      'lastName',
      'phoneNumber',
      'bookedAt',
      'invoiceId',
      'invoiceNumber',
      'source',
      'reference',
      'amountPaidCents',
      'ticketType',
    ]);
  });
});
