import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { cairoLocalToUtcIso, toCairoDatetimeLocal } from '../../src/shared/utils/dateUtils.ts';

const DATE_UTILS_PATH = fileURLToPath(
  new URL('../../src/shared/utils/dateUtils.ts', import.meta.url),
);

// Africa/Cairo observes DST: summer is +03:00, winter is +02:00. The save must derive the
// correct offset *for the entered date* from IANA — the same source the display trusts — so the
// round-trip is the identity regardless of the machine's local timezone (TZ env).
describe('cairoLocalToUtcIso', () => {
  it('summer date (+03:00): 2:30 PM Cairo -> 11:30 UTC', () => {
    assert.equal(cairoLocalToUtcIso('2026-07-15T14:30'), '2026-07-15T11:30:00.000Z');
  });

  it('winter date (+02:00): 2:30 PM Cairo -> 12:30 UTC', () => {
    assert.equal(cairoLocalToUtcIso('2026-01-15T14:30'), '2026-01-15T12:30:00.000Z');
  });

  it('round-trips through toCairoDatetimeLocal in winter (the case the old design broke)', () => {
    const utc = cairoLocalToUtcIso('2026-01-15T14:30');
    assert.equal(toCairoDatetimeLocal(utc), '2026-01-15T14:30');
  });

  it('round-trips through toCairoDatetimeLocal in summer', () => {
    const utc = cairoLocalToUtcIso('2026-07-15T14:30');
    assert.equal(toCairoDatetimeLocal(utc), '2026-07-15T14:30');
  });

  it('handles the 2026 spring DST boundary using each side of Cairo offset', () => {
    assert.equal(cairoLocalToUtcIso('2026-04-23T23:30'), '2026-04-23T21:30:00.000Z');
    assert.equal(cairoLocalToUtcIso('2026-04-24T01:30'), '2026-04-23T22:30:00.000Z');
  });

  it('handles the 2026 autumn DST boundary using each side of Cairo offset', () => {
    assert.equal(cairoLocalToUtcIso('2026-10-29T22:30'), '2026-10-29T19:30:00.000Z');
    assert.equal(cairoLocalToUtcIso('2026-10-29T23:30'), '2026-10-29T21:30:00.000Z');
  });

  it('is environment-independent — never equals the old wall±deviceOffset output', () => {
    // The old getCairoOffsetString() produced (Cairo − browserOffset); on any non-Cairo TZ this
    // diverges from the correct UTC. The correct conversion is a fixed UTC instant.
    assert.equal(cairoLocalToUtcIso('2026-07-15T14:30'), '2026-07-15T11:30:00.000Z');
  });

  it('returns an empty string for empty or invalid input (no throw)', () => {
    assert.equal(cairoLocalToUtcIso(''), '');
    assert.equal(cairoLocalToUtcIso('not-a-date'), '');
    assert.equal(cairoLocalToUtcIso(undefined), '');
  });
});

// Node caches the process timezone at startup, so mutating process.env.TZ mid-run does NOT change
// Date/Intl behavior. The only reliable way to prove cairoLocalToUtcIso is TZ-independent is to run
// the conversion in CHILD PROCESSES, each spawned with a different TZ. If a regression ever made the
// converter read the local zone (the bug Phase B fixed), one of these matrix rows would diverge and
// fail CI. Children inherit the parent's execArgv (strip-types + loader) so they can import the .ts.
describe('cairoLocalToUtcIso is environment-independent across TZ (child-process matrix)', () => {
  const TIMEZONES = ['UTC', 'Africa/Cairo', 'America/New_York', 'Asia/Karachi'];
  const EXPECTED = { summer: '2026-07-15T11:30:00.000Z', winter: '2026-01-15T12:30:00.000Z' };

  const convertUnderTz = (tz: string) => {
    const script = `import { cairoLocalToUtcIso } from ${JSON.stringify(DATE_UTILS_PATH)};
process.stdout.write(JSON.stringify({
  summer: cairoLocalToUtcIso('2026-07-15T14:30'),
  winter: cairoLocalToUtcIso('2026-01-15T14:30'),
}));`;
    const stdout = execFileSync(
      process.execPath,
      [...process.execArgv, '--input-type=module', '--eval', script],
      { env: { ...process.env, TZ: tz }, encoding: 'utf8' },
    );
    return JSON.parse(stdout);
  };

  for (const tz of TIMEZONES) {
    it(`produces identical correct UTC under TZ=${tz}`, () => {
      assert.deepEqual(convertUnderTz(tz), EXPECTED);
    });
  }
});
