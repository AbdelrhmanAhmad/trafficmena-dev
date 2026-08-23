import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { bookingGrantsRecording } from '../../server/src/routes/api/ticketAccess.ts';

describe('bookingGrantsRecording (library + series recording access)', () => {
  it('gives every ticket the offline-session recordings', () => {
    assert.equal(bookingGrantsRecording('online_only', 'offline'), true);
    assert.equal(bookingGrantsRecording('online_offline', 'offline'), true);
    assert.equal(bookingGrantsRecording('offline_only', 'offline'), true);
  });

  it('withholds online-session recordings from offline_only', () => {
    assert.equal(bookingGrantsRecording('offline_only', 'online'), false);
    assert.equal(bookingGrantsRecording('online_only', 'online'), true);
  });

  it('treats a recording with no linked event as general content (all tickets)', () => {
    assert.equal(bookingGrantsRecording('online_only', null), true);
    assert.equal(bookingGrantsRecording('offline_only', null), true);
  });

  it('gives a legacy (null) booking access to every recording', () => {
    assert.equal(bookingGrantsRecording(null, 'online'), true);
    assert.equal(bookingGrantsRecording(null, 'offline'), true);
    assert.equal(bookingGrantsRecording(null, null), true);
  });
});

describe('library recording access is ticket-aware (wiring)', () => {
  it('list threads asset eventFormat into resolveLibraryAssetAccess', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/library.ts', import.meta.url),
      'utf8',
    );
    assert.ok(source.includes('eventFormat: events.eventFormat'));
    assert.ok(source.includes('assetEventFormat: item.eventFormat ?? null'));
  });

  it('detail threads asset eventFormat into resolveLibraryAssetAccess', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/library.ts', import.meta.url),
      'utf8',
    );
    assert.ok(source.includes('assetEventFormat: asset[0].eventFormat ?? null'));
  });

  it('seriesAccess applies bookingGrantsRecording with assetEventFormat', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/seriesAccess.ts', import.meta.url),
      'utf8',
    );
    assert.ok(
      source.includes('bookingGrantsRecording(input.bookingTicketType, input.assetEventFormat)'),
    );
  });

  it('locked assets null out every content URL', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/library.ts', import.meta.url),
      'utf8',
    );
    // The list path strips playable/document/embed URLs for assets the viewer cannot access.
    assert.ok(source.includes('fileUrl: null'));
    assert.ok(source.includes('videoUrl: null'));
    assert.ok(source.includes('documentUrl: null'));
    assert.ok(source.includes('embedUrl: null'));
  });

  it('series asset access threads bookingTicketType + assetEventFormat', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/series.ts', import.meta.url),
      'utf8',
    );
    assert.ok(source.includes('bookingTicketType'));
    assert.ok(source.includes('assetEventFormat: sa.asset.eventFormat ?? null'));
  });
});
