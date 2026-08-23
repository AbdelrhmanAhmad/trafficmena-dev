import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

describe('event format override safety', () => {
  it('builds an affected-track report before applying risky delivery-mode changes', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/events.ts', import.meta.url),
      'utf8',
    );
    const updateRoute = source.indexOf("'/events/:id'");
    const reportCall = source.indexOf('buildEventFormatChangeReport({', updateRoute);
    const updateCall = source.indexOf('.update(events)', updateRoute);

    assert.ok(updateRoute >= 0);
    assert.ok(reportCall > updateRoute);
    assert.ok(updateCall > reportCall);
  });

  it('blocks managers and requires owner/admin audit reasons for risky overrides', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/events.ts', import.meta.url),
      'utf8',
    );

    assert.ok(source.includes('EVENT_FORMAT_LOCKED'));
    assert.ok(source.includes('EVENT_FORMAT_OVERRIDE_REASON_REQUIRED'));
    assert.ok(source.includes("console.warn('[events/event_format_override]'"));
  });

  it('reports event-level reservations separately from affected tracks', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/events.ts', import.meta.url),
      'utf8',
    );

    assert.ok(source.includes('activeEventReservations: number'));
    assert.ok(source.includes('eventFormatChangeReport.activeEventReservations > 0'));
    assert.equal(source.includes('activeEventReservations,\\n      }))'), false);
  });

  it('lets the server decide when an audit reason is required', async () => {
    const formSource = await readFile(
      new URL('../../src/features/events/components/AdminEventForm.tsx', import.meta.url),
      'utf8',
    );

    assert.equal(formSource.includes('Audit reason required'), false);
  });

  it('prevents event format changes that break published ticket coverage', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/events.ts', import.meta.url),
      'utf8',
    );
    const updateRoute = source.indexOf("'/events/:id'");
    const coverageCheck = source.indexOf(
      'assertEventFormatChangeKeepsTicketCoverage({',
      updateRoute,
    );
    const updateCall = source.indexOf('.update(events)', updateRoute);

    assert.ok(coverageCheck > updateRoute);
    assert.ok(updateCall > coverageCheck);
  });
});
