import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { formatAddEventsDescription } from '../../src/features/tracks/utils/formatAddEventsDescription.ts';

const hookSource = await readFile(
  new URL('../../src/features/tracks/hooks/useTracks.ts', import.meta.url),
  'utf8',
);

describe('formatAddEventsDescription', () => {
  it('is exported through the track hook module', () => {
    assert.match(hookSource, /export \{ formatAddEventsDescription \}/);
  });

  it('keeps the existing zero-registration event copy and plurality', () => {
    assert.equal(formatAddEventsDescription({ addedCount: 1 }), 'Added 1 event to the track.');
    assert.equal(formatAddEventsDescription({ addedCount: 2 }), 'Added 2 events to the track.');
  });

  it('reports registrations without a skipped sentence when none were skipped', () => {
    assert.equal(
      formatAddEventsDescription({
        addedCount: 1,
        backfilledCount: 1,
        reactivatedCount: 0,
      }),
      'Session added. 1 registration created.',
    );
  });

  it('appends skipped registrations with singular and plural boundaries', () => {
    assert.equal(
      formatAddEventsDescription({
        addedCount: 1,
        backfilledCount: 1,
        skippedExistingCount: 1,
      }),
      'Session added. 1 registration created. 1 existing registration skipped.',
    );
    assert.equal(
      formatAddEventsDescription({
        addedCount: 2,
        backfilledCount: 1,
        reactivatedCount: 1,
        skippedExistingCount: 2,
      }),
      'Session added. 2 registrations created. 2 existing registrations skipped.',
    );
  });
});
