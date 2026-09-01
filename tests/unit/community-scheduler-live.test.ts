import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgres://postgres:0000@127.0.0.1:5432/trafficmena_dev';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const { db } = await import('../../server/src/db/client.ts');
const { activityAnnouncements, profiles, users } = await import('../../server/src/db/schema/index.ts');

const STAFF_ID = 'cccccccc-cccc-cccc-cccc-cccccccccc01';
const ANN_FUTURE = 'b1000000-0000-4000-8000-000000000001';
const ANN_DUE = 'b1000000-0000-4000-8000-000000000002';
const ANN_CANCELLED = 'b1000000-0000-4000-8000-000000000003';
const ANN_PUBLISHED = 'b1000000-0000-4000-8000-000000000004';

const FIXTURE_IDS = [ANN_FUTURE, ANN_DUE, ANN_CANCELLED, ANN_PUBLISHED];

const { eq, inArray } = await import('../../server/node_modules/drizzle-orm/index.js');

let pgReady = false;

async function tryPg(): Promise<boolean> {
  try {
    await db.select({ id: users.id }).from(users).limit(1);
    return true;
  } catch {
    return false;
  }
}

async function upsertStaff() {
  await db
    .insert(users)
    .values({ id: STAFF_ID, email: 'w10-sched-staff@example.com', name: 'W10 Staff', emailVerified: true })
    .onConflictDoUpdate({ target: users.id, set: { email: 'w10-sched-staff@example.com' } });
  await db
    .insert(profiles)
    .values({ id: STAFF_ID, role: 'manager', firstName: 'W10', lastName: 'Staff' })
    .onConflictDoUpdate({ target: profiles.id, set: { role: 'manager' } });
}

async function seedAnnouncements() {
  await db.delete(activityAnnouncements).where(inArray(activityAnnouncements.id, FIXTURE_IDS));

  const base = {
    titleEn: 'W10 Scheduler',
    titleAr: 'W10 Scheduler AR',
    bodyEn: '<p>body</p>',
    bodyAr: '<p>body ar</p>',
    createdBy: STAFF_ID,
  };

  await db.insert(activityAnnouncements).values([
    {
      id: ANN_FUTURE,
      ...base,
      status: 'scheduled',
      scheduledAt: new Date('2099-06-01T12:00:00.000Z'),
      cancelledAt: null,
    },
    {
      id: ANN_DUE,
      ...base,
      status: 'scheduled',
      scheduledAt: new Date('2026-03-01T12:00:00.000Z'),
      cancelledAt: null,
    },
    {
      id: ANN_CANCELLED,
      ...base,
      status: 'cancelled',
      scheduledAt: new Date('2020-01-01T12:00:00.000Z'),
      cancelledAt: new Date('2020-01-02T12:00:00.000Z'),
    },
    {
      id: ANN_PUBLISHED,
      ...base,
      status: 'published',
      scheduledAt: new Date('2020-01-01T12:00:00.000Z'),
      publishedAt: new Date('2020-01-01T12:05:00.000Z'),
      cancelledAt: null,
    },
  ]);
}

async function cleanup() {
  await db.delete(activityAnnouncements).where(inArray(activityAnnouncements.id, FIXTURE_IDS));
}

async function loadStatus(id: string) {
  const [row] = await db
    .select({
      status: activityAnnouncements.status,
      publishedAt: activityAnnouncements.publishedAt,
    })
    .from(activityAnnouncements)
    .where(eq(activityAnnouncements.id, id))
    .limit(1);
  return row;
}

describe('community scheduler live PostgreSQL', () => {
  before(async () => {
    pgReady = await tryPg();
    assert.ok(pgReady, 'PostgreSQL required at DATABASE_URL for scheduler live tests');
    await upsertStaff();
    await seedAnnouncements();
  });

  after(async () => {
    if (pgReady) await cleanup();
  });

  it('A: future scheduled announcement is not published early', async () => {
    const { publishDueAnnouncements } = await import(
      '../../server/src/services/community/announcements.ts'
    );
    const now = new Date('2026-01-01T00:00:00.000Z');
    await publishDueAnnouncements(now);
    const row = await loadStatus(ANN_FUTURE);
    assert.equal(row?.status, 'scheduled');
    assert.equal(row?.publishedAt, null);
  });

  it('B: due scheduled announcement becomes published', async () => {
    const { publishDueAnnouncements } = await import(
      '../../server/src/services/community/announcements.ts'
    );
    const now = new Date('2026-06-01T00:00:00.000Z');
    const count = await publishDueAnnouncements(now);
    assert.ok(count >= 1);
    const row = await loadStatus(ANN_DUE);
    assert.equal(row?.status, 'published');
    assert.ok(row?.publishedAt);
  });

  it('C: cancelled scheduled announcement is never published', async () => {
    const { publishDueAnnouncements } = await import(
      '../../server/src/services/community/announcements.ts'
    );
    await publishDueAnnouncements(new Date('2099-01-01T00:00:00.000Z'));
    const row = await loadStatus(ANN_CANCELLED);
    assert.equal(row?.status, 'cancelled');
    assert.equal(row?.publishedAt, null);
  });

  it('D: already published announcement has no duplicate transition', async () => {
    const before = await loadStatus(ANN_PUBLISHED);
    assert.equal(before?.status, 'published');
    const publishedAtBefore = before?.publishedAt?.toISOString();

    const { publishDueAnnouncements } = await import(
      '../../server/src/services/community/announcements.ts'
    );
    await publishDueAnnouncements(new Date('2099-01-01T00:00:00.000Z'));

    const after = await loadStatus(ANN_PUBLISHED);
    assert.equal(after?.status, 'published');
    assert.equal(after?.publishedAt?.toISOString(), publishedAtBefore);
  });

  it('E: double scheduler run keeps published state consistent', async () => {
    const { publishDueAnnouncements } = await import(
      '../../server/src/services/community/announcements.ts'
    );
    const now = new Date('2026-06-01T00:00:00.000Z');
    const first = await publishDueAnnouncements(now);
    const second = await publishDueAnnouncements(now);
    assert.equal(second, 0);
    const row = await loadStatus(ANN_DUE);
    assert.equal(row?.status, 'published');
    assert.ok(first >= 0);
  });
});
