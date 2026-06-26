import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import {
  deriveLegacyEventFormat,
  isLiteralFormatText,
  type LegacyEventRow,
  legacyOnlineInference,
} from '../../server/src/utils/eventFormat.ts';

describe('event_format backfill intent', () => {
  it('maps a meeting link with no location to online (keeps location null)', () => {
    const decision = deriveLegacyEventFormat({
      meetingLink: 'https://zoom.us/j/123',
      location: null,
    });
    assert.deepEqual(decision, { format: 'online', clearLocation: false });
  });

  it('maps literal "online" location text to online and clears the text', () => {
    assert.deepEqual(deriveLegacyEventFormat({ meetingLink: null, location: 'online' }), {
      format: 'online',
      clearLocation: true,
    });
    // Case-insensitive + whitespace tolerant.
    assert.deepEqual(deriveLegacyEventFormat({ meetingLink: null, location: '  Online ' }), {
      format: 'online',
      clearLocation: true,
    });
  });

  it('maps literal "offline" location text to offline and clears the text', () => {
    assert.deepEqual(deriveLegacyEventFormat({ meetingLink: null, location: 'OFFLINE' }), {
      format: 'offline',
      clearLocation: true,
    });
  });

  it('keeps a real address as offline', () => {
    assert.deepEqual(deriveLegacyEventFormat({ meetingLink: null, location: 'Dubai, UAE' }), {
      format: 'offline',
      clearLocation: false,
    });
  });

  it('defaults an incomplete row (neither link nor location) to online', () => {
    assert.deepEqual(deriveLegacyEventFormat({ meetingLink: null, location: null }), {
      format: 'online',
      clearLocation: false,
    });
    assert.deepEqual(deriveLegacyEventFormat({ meetingLink: '', location: '' }), {
      format: 'online',
      clearLocation: false,
    });
  });

  it('identifies literal delivery-mode text vs a real address', () => {
    assert.equal(isLiteralFormatText('online'), true);
    assert.equal(isLiteralFormatText('Offline'), true);
    assert.equal(isLiteralFormatText('Dubai, UAE'), false);
    assert.equal(isLiteralFormatText(null), false);
  });
});

describe('event_format pricing characterization (no silent flips)', () => {
  // The subscriber "free online" decision must be unchanged for rows where the old inference and the
  // new explicit format AGREE. This pins behavior before the six call sites are swapped.
  const agreeingRows: LegacyEventRow[] = [
    { meetingLink: 'https://zoom.us/j/1', location: null }, // online both ways
    { meetingLink: null, location: 'Dubai, UAE' }, // offline both ways
    { meetingLink: 'https://zoom.us/j/2', location: 'Cairo, EG' }, // hybrid text -> offline both ways
  ];

  for (const row of agreeingRows) {
    it(`agrees for ${JSON.stringify(row)}`, () => {
      const oldIsOnline = legacyOnlineInference(row);
      const newIsOnline = deriveLegacyEventFormat(row).format === 'online';
      assert.equal(newIsOnline, oldIsOnline);
    });
  }

  it('flags the intended correction: literal "online" text flips offline -> online', () => {
    const row: LegacyEventRow = { meetingLink: null, location: 'online' };
    // Old inference saw a non-empty location and called it offline (the bug).
    assert.equal(legacyOnlineInference(row), false);
    // New intent recognizes it as online (free for subscribers) — surfaced in the diff report.
    assert.equal(deriveLegacyEventFormat(row).format, 'online');
  });

  it('flags the product decision: no location and no meeting link flips offline -> online', () => {
    const row: LegacyEventRow = { meetingLink: null, location: null };
    assert.equal(legacyOnlineInference(row), false);
    assert.equal(deriveLegacyEventFormat(row).format, 'online');
  });
});

describe('event_format production migration gate', () => {
  it('documents the preflight report and human signoff requirement', async () => {
    const runbook = await readFile(
      new URL('../../docs/runbooks/event-format-0018-migration-preflight.md', import.meta.url),
      'utf8',
    );
    const serverPackage = JSON.parse(
      await readFile(new URL('../../server/package.json', import.meta.url), 'utf8'),
    );

    assert.match(runbook, /preflight_event_format_report\.sql/);
    assert.match(runbook, /human signoff/i);
    assert.match(runbook, /0018_fast_sleepwalker\.sql/);
    assert.equal(
      serverPackage.scripts['db:preflight:event-format'],
      'psql "$DATABASE_URL" -f ./drizzle/preflight_event_format_report.sql',
    );
  });

  it('blocks production-like db:migrate unless the preflight gate is signed off', async () => {
    const serverPackage = JSON.parse(
      await readFile(new URL('../../server/package.json', import.meta.url), 'utf8'),
    );
    const guard = await readFile(
      new URL('../../server/scripts/guard-event-format-migration.mjs', import.meta.url),
      'utf8',
    );

    assert.match(serverPackage.scripts['db:migrate'], /guard-event-format-migration\.mjs/);
    assert.match(guard, /EVENT_FORMAT_0018_SIGNOFF/);
    assert.match(guard, /EVENT_FORMAT_0018_SIGNOFF_BY/);
    assert.match(guard, /preflight:event-format/);
    assert.match(guard, /backup/i);
  });
});
