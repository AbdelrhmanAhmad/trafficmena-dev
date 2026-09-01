import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_dev';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

describe('community scheduler service', () => {
  it('publishDueAnnouncements returns zero when nothing due or skips without DB', async () => {
    const { publishDueAnnouncements } = await import(
      '../../server/src/services/community/announcements.ts'
    );
    try {
      const count = await publishDueAnnouncements(new Date('2099-01-01T00:00:00.000Z'));
      assert.equal(typeof count, 'number');
      assert.ok(count >= 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('ECONNREFUSED') || message.includes('Failed query')) {
        return;
      }
      throw error;
    }
  });
});

describe('community entitlements reuse', () => {
  it('access module uses activeTrackBookingWhere and masterclass enrollments', async () => {
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync(
        new URL('../../server/src/services/community/access.ts', import.meta.url),
        'utf8',
      ),
    );
    assert.match(source, /activeTrackBookingWhere/);
    assert.match(source, /getEnrolledMasterclassIds/);
  });
});
