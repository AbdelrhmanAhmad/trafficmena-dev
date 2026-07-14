import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

async function readTracksSource(): Promise<string> {
  return readFile(new URL('../../server/src/routes/api/tracks.ts', import.meta.url), 'utf8');
}

function addHandlerSlice(source: string): string {
  const start = source.indexOf('// Add events to track');
  const end = source.indexOf('// Remove event from track', start);
  assert.ok(start >= 0 && end > start, 'track-event add handler markers must remain present');
  return source.slice(start, end);
}

describe('booked-track event addition wiring', () => {
  it('allows booked additions while preserving removal decision wiring', async () => {
    const source = await readTracksSource();
    const addHandler = addHandlerSlice(source);
    const removeHandler = source.slice(source.indexOf('// Remove event from track'));

    assert.equal(addHandler.includes("'TRACK_HAS_BOOKINGS'"), false);
    assert.equal(removeHandler.includes("'TRACK_HAS_BOOKINGS'"), false);
    assert.ok(removeHandler.includes('evaluateTrackEventRemoval('));
  });

  it('locks the track, events, payments NOWAIT, and active bookings', async () => {
    const addHandler = addHandlerSlice(await readTracksSource());
    const trackLock =
      /from\(tracks\)[^;]*?\.where\(eq\(tracks\.id, trackId\)\)[^;]*?\.for\('update'\)/;
    const eventsLock =
      /from\(events\)[^;]*?\.where\(inArray\(events\.id, newEventIds\)\)[^;]*?\.orderBy\(asc\(events\.id\)\)[^;]*?\.for\('update'\)/;
    const paymentsLock =
      /from\(payments\)[^;]*?\.where\(inArray\(payments\.id, candidatePaymentIds\)\)[^;]*?\.orderBy\(asc\(payments\.id\)\)[^;]*?\.for\('update', \{ noWait: true \}\)/;
    const bookingsLock =
      /from\(trackBookings\)[^;]*?\.where\(activeTrackBookingWhere\(eq\(trackBookings\.trackId, trackId\)\)\)[^;]*?\.for\('update'\)/;

    assert.match(addHandler, trackLock);
    assert.match(addHandler, eventsLock);
    assert.match(addHandler, paymentsLock);
    assert.match(addHandler, bookingsLock);

    const withoutBookedEventsLock = addHandler.replace(
      /(\.orderBy\(asc\(events\.id\)\))\s*\.for\('update'\)/,
      '$1',
    );
    assert.doesNotMatch(withoutBookedEventsLock, eventsLock);
  });

  it('uses the shared database error-code utility for lock retries', async () => {
    const source = await readTracksSource();
    assert.ok(source.includes('DATABASE_ERROR_CODES,'));
    assert.ok(source.includes('extractDatabaseErrorCode,'));
    assert.ok(
      source.includes(
        'extractDatabaseErrorCode(error) !== DATABASE_ERROR_CODES.LOCK_NOT_AVAILABLE',
      ),
    );
    assert.equal(source.includes('function isLockNotAvailable('), false);
  });

  it('calls all three pure decisions in classification-plan-evaluate order', async () => {
    const source = await readTracksSource();
    const addHandler = addHandlerSlice(source);
    assert.ok(source.includes('classifyTrackEventBackfill,'));
    assert.ok(source.includes('evaluateTrackEventAdditionCapacity,'));
    assert.ok(source.includes('planTrackEventReservationHolds,'));

    const classify = addHandler.indexOf('classifyTrackEventBackfill(');
    const holds = addHandler.indexOf('planTrackEventReservationHolds(');
    const capacity = addHandler.indexOf('evaluateTrackEventAdditionCapacity(');
    assert.ok(classify >= 0);
    assert.ok(holds > classify);
    assert.ok(capacity > holds);
  });

  it('writes matrix-sourced attendees and reservation holds after stale cleanup', async () => {
    const addHandler = addHandlerSlice(await readTracksSource());
    assert.ok(addHandler.includes('sourceTrackBookingId: row.sourceTrackBookingId'));
    const staleDelete = addHandler.indexOf('delete(eventReservations)');
    const holdInsert = addHandler.indexOf('insert(eventReservations)');
    assert.ok(staleDelete >= 0);
    assert.ok(holdInsert > staleDelete);
  });

  it('keeps series linking and paid-track premium updates in the transaction', async () => {
    const addHandler = addHandlerSlice(await readTracksSource());
    assert.ok(addHandler.includes("// Link event assets to track's Series"));
    assert.ok(addHandler.includes('isPremium: true'));
    assert.ok(addHandler.includes('insert(seriesAssets)'));
  });
});
