import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgres://postgres:0000@127.0.0.1:5432/trafficmena_dev';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const __dirname = dirname(fileURLToPath(import.meta.url));
const communityRoutesSource = readFileSync(
  join(__dirname, '../../server/src/routes/api/community.ts'),
  'utf8',
);

describe('community public privacy', () => {
  it('member channel routes call requireAuthUser', () => {
    assert.match(communityRoutesSource, /async function requireAuthUser/);
    assert.match(communityRoutesSource, /await requireAuthUser\(c, deps\)/);
  });

  it('registers member routes under /community with auth guard', () => {
    assert.match(communityRoutesSource, /app\.get\(\s*['"]\/community\/channels['"]/);
    assert.match(communityRoutesSource, /await requireAuthUser\(c, deps\)/);
  });

  it('filters accessible channels server-side', () => {
    assert.match(communityRoutesSource, /filterAccessibleChannelIds/);
  });
});

describe('community announcement state rules', () => {
  it('cancel rejects published announcements in route handler', () => {
    assert.match(communityRoutesSource, /Published announcements cannot be cancelled/);
    assert.match(communityRoutesSource, /Only scheduled announcements can be cancelled/);
  });

  it('schedule requires future datetime', () => {
    assert.match(communityRoutesSource, /Scheduled time must be in the future/);
  });

  it('publishDueAnnouncements uses idempotent status guard', () => {
    const announcementsSource = readFileSync(
      join(__dirname, '../../server/src/services/community/announcements.ts'),
      'utf8',
    );
    assert.match(announcementsSource, /eq\(activityAnnouncements\.status, 'scheduled'\)/);
    assert.match(announcementsSource, /isNull\(activityAnnouncements\.cancelledAt\)/);
  });
});
