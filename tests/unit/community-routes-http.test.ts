import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://postgres:0000@127.0.0.1:5432/trafficmena_dev';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const { db } = await import('../../server/src/db/client.ts');
const {
  activityAnnouncements,
  activityChannelEntitlements,
  activityChannels,
  activityPosts,
  masterclassEnrollments,
  masterclasses,
  profiles,
  trackBookings,
  tracks,
  users,
} = await import('../../server/src/db/schema/index.ts');
const { createTestAuthDeps } = await import('../../server/src/routes/api/communityRouteDeps.ts');

const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER_C = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const STAFF_ID = 'cccccccc-cccc-cccc-cccc-cccccccccc01';

const CH_OPEN = 'd1000000-0000-4000-8000-000000000001';
const CH_STAFF = 'd1000000-0000-4000-8000-000000000002';
const CH_GATED = 'd1000000-0000-4000-8000-000000000003';
const CH_ARCHIVED = 'd1000000-0000-4000-8000-000000000004';
const CH_OPEN_NO_APPROVAL = 'd1000000-0000-4000-8000-000000000005';
const CH_TRACK_GATED = 'd1000000-0000-4000-8000-000000000006';
const CH_MC_GATED = 'd1000000-0000-4000-8000-000000000007';
const CH_OR_GATED = 'd1000000-0000-4000-8000-000000000008';

const TRACK_W10 = 'f1000000-0000-4000-8000-000000000001';
const MC_W10 = 'f2000000-0000-4000-8000-000000000001';
const BOOKING_A = 'f3000000-0000-4000-8000-000000000001';
const ENROLL_B = 'f4000000-0000-4000-8000-000000000001';

const POST_A = 'e1000000-0000-4000-8000-000000000001';
const POST_PENDING = 'e1000000-0000-4000-8000-000000000002';
const POST_REJECTED = 'e1000000-0000-4000-8000-000000000003';

const COVER = 'https://example.com/cover.jpg';
const TEST_SLUG_PREFIX = 'w10-test-';

const { inArray, like } = await import('../../server/node_modules/drizzle-orm/index.js');
const { registerCommunityRoutes } = await import('../../server/src/routes/api/community.ts');

let pgReady = false;

async function tryPg(): Promise<boolean> {
  try {
    await db.select({ id: users.id }).from(users).limit(1);
    return true;
  } catch {
    return false;
  }
}

async function upsertUser(id: string, email: string, role: string) {
  await db
    .insert(users)
    .values({ id, email, name: `W10 ${role}`, emailVerified: true })
    .onConflictDoUpdate({ target: users.id, set: { email, name: `W10 ${role}` } });
  await db
    .insert(profiles)
    .values({ id, role: role as 'user' | 'manager', firstName: 'W10', lastName: role })
    .onConflictDoUpdate({ target: profiles.id, set: { role: role as 'user' | 'manager' } });
}

async function seedFixtures() {
  await upsertUser(USER_A, 'w10-test-a@example.com', 'user');
  await upsertUser(USER_B, 'w10-test-b@example.com', 'user');
  await upsertUser(USER_C, 'w10-test-c@example.com', 'user');
  await upsertUser(STAFF_ID, 'w10-test-staff@example.com', 'manager');

  await db
    .insert(tracks)
    .values({
      id: TRACK_W10,
      title: 'W10 Track',
      titleEn: 'W10 Track',
      titleAr: 'W10 Track AR',
    })
    .onConflictDoNothing();

  await db
    .insert(masterclasses)
    .values({
      id: MC_W10,
      title: 'W10 Masterclass',
      titleEn: 'W10 Masterclass',
      titleAr: 'W10 Masterclass AR',
      isPublished: true,
    })
    .onConflictDoNothing();

  await db.delete(trackBookings).where(inArray(trackBookings.id, [BOOKING_A]));
  await db.insert(trackBookings).values({
    id: BOOKING_A,
    trackId: TRACK_W10,
    userId: USER_A,
    bookingSource: 'manual',
  });

  await db.delete(masterclassEnrollments).where(inArray(masterclassEnrollments.id, [ENROLL_B]));
  await db.insert(masterclassEnrollments).values({
    id: ENROLL_B,
    userId: USER_B,
    masterclassId: MC_W10,
    source: 'manual',
  });

  const channels = [
    { id: CH_OPEN, slug: `${TEST_SLUG_PREFIX}open`, channelType: 'open' as const, requiresApproval: true },
    {
      id: CH_OPEN_NO_APPROVAL,
      slug: `${TEST_SLUG_PREFIX}open-no-approval`,
      channelType: 'open' as const,
      requiresApproval: false,
    },
    { id: CH_STAFF, slug: `${TEST_SLUG_PREFIX}staff`, channelType: 'staff_post' as const, requiresApproval: true },
    {
      id: CH_GATED,
      slug: `${TEST_SLUG_PREFIX}gated`,
      channelType: 'entitlement_gated' as const,
      requiresApproval: true,
    },
    {
      id: CH_TRACK_GATED,
      slug: `${TEST_SLUG_PREFIX}track-gated`,
      channelType: 'entitlement_gated' as const,
      requiresApproval: true,
    },
    {
      id: CH_MC_GATED,
      slug: `${TEST_SLUG_PREFIX}mc-gated`,
      channelType: 'entitlement_gated' as const,
      requiresApproval: true,
    },
    {
      id: CH_OR_GATED,
      slug: `${TEST_SLUG_PREFIX}or-gated`,
      channelType: 'entitlement_gated' as const,
      requiresApproval: true,
    },
    {
      id: CH_ARCHIVED,
      slug: `${TEST_SLUG_PREFIX}archived`,
      channelType: 'open' as const,
      requiresApproval: true,
      archivedAt: new Date(),
    },
  ];

  for (const ch of channels) {
    await db
      .insert(activityChannels)
      .values({
        id: ch.id,
        slug: ch.slug,
        nameEn: ch.slug,
        nameAr: ch.slug,
        channelType: ch.channelType,
        coverImageUrl: COVER,
        requiresApproval: ch.requiresApproval,
        archivedAt: 'archivedAt' in ch ? ch.archivedAt : null,
      })
      .onConflictDoUpdate({
        target: activityChannels.id,
        set: {
          slug: ch.slug,
          channelType: ch.channelType,
          requiresApproval: ch.requiresApproval,
          archivedAt: 'archivedAt' in ch ? ch.archivedAt : null,
        },
      });
  }

  await db.delete(activityPosts).where(inArray(activityPosts.id, [POST_A, POST_PENDING, POST_REJECTED]));

  const entitlementChannelIds = [CH_GATED, CH_TRACK_GATED, CH_MC_GATED, CH_OR_GATED];
  await db
    .delete(activityChannelEntitlements)
    .where(inArray(activityChannelEntitlements.channelId, entitlementChannelIds));

  await db.insert(activityChannelEntitlements).values([
    { channelId: CH_GATED, trackId: TRACK_W10, masterclassId: null },
    { channelId: CH_TRACK_GATED, trackId: TRACK_W10, masterclassId: null },
    { channelId: CH_MC_GATED, trackId: null, masterclassId: MC_W10 },
    { channelId: CH_OR_GATED, trackId: TRACK_W10, masterclassId: null },
    { channelId: CH_OR_GATED, trackId: null, masterclassId: MC_W10 },
  ]);

  await db.insert(activityPosts).values([
    {
      id: POST_A,
      channelId: CH_OPEN,
      authorUserId: USER_A,
      bodyHtml: '<p>Post A</p>',
      status: 'published',
      publishedAt: new Date(),
    },
    {
      id: POST_PENDING,
      channelId: CH_OPEN,
      authorUserId: USER_A,
      bodyHtml: '<p>Pending</p>',
      status: 'pending',
    },
    {
      id: POST_REJECTED,
      channelId: CH_OPEN,
      authorUserId: USER_A,
      bodyHtml: '<p>Rejected</p>',
      status: 'rejected',
    },
  ]);
}

async function cleanupFixtures() {
  await db.delete(activityPosts).where(inArray(activityPosts.id, [POST_A, POST_PENDING, POST_REJECTED]));
  await db.delete(activityPosts).where(like(activityPosts.bodyHtml, '%w10-http-created%'));
  await db.delete(activityAnnouncements).where(like(activityAnnouncements.titleEn, 'W10 %'));
  await db
    .delete(activityChannelEntitlements)
    .where(
      inArray(activityChannelEntitlements.channelId, [
        CH_GATED,
        CH_TRACK_GATED,
        CH_MC_GATED,
        CH_OR_GATED,
      ]),
    );
  await db.delete(activityChannels).where(like(activityChannels.slug, `${TEST_SLUG_PREFIX}%`));
  await db.delete(trackBookings).where(inArray(trackBookings.id, [BOOKING_A]));
  await db.delete(masterclassEnrollments).where(inArray(masterclassEnrollments.id, [ENROLL_B]));
  await db.delete(tracks).where(inArray(tracks.id, [TRACK_W10]));
  await db.delete(masterclasses).where(inArray(masterclasses.id, [MC_W10]));
}

describe('community routes HTTP (integration)', () => {
  before(async () => {
    pgReady = await tryPg();
    assert.ok(pgReady, 'PostgreSQL required at DATABASE_URL for community HTTP integration tests');
    await seedFixtures();
  });

  after(async () => {
    if (pgReady) await cleanupFixtures();
  });

  it('open channel: member can view and post (pending when approval required)', async () => {
    const app = new Hono();
    registerCommunityRoutes(app, createTestAuthDeps('user', USER_A));

    const view = await app.request(`/community/channels/${TEST_SLUG_PREFIX}open`, { method: 'GET' });
    assert.equal(view.status, 200);

    const create = await app.request(`/community/channels/${TEST_SLUG_PREFIX}open/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bodyHtml: '<p>w10-http-created pending</p>', status: 'published' }),
    });
    assert.equal(create.status, 201);
    const feed = await app.request(`/community/channels/${TEST_SLUG_PREFIX}open/feed`, { method: 'GET' });
    assert.equal(feed.status, 200);
    const feedBody = (await feed.json()) as { posts: Array<{ bodyHtml: string; status?: string }> };
    const pendingPost = feedBody.posts.find((p) => p.bodyHtml.includes('w10-http-created pending'));
    assert.ok(pendingPost);
  });

  it('open channel without approval: post publishes immediately', async () => {
    const app = new Hono();
    registerCommunityRoutes(app, createTestAuthDeps('user', USER_A));

    const create = await app.request(`/community/channels/${TEST_SLUG_PREFIX}open-no-approval/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bodyHtml: '<p>w10-http-created published</p>', status: 'published' }),
    });
    assert.equal(create.status, 201);
    const feed = await app.request(`/community/channels/${TEST_SLUG_PREFIX}open-no-approval/feed`, {
      method: 'GET',
    });
    assert.equal(feed.status, 200);
    const feedBody = (await feed.json()) as { posts: Array<{ bodyHtml: string }> };
    assert.ok(feedBody.posts.some((p) => p.bodyHtml.includes('w10-http-created published')));
  });

  it('staff_post: member cannot create post', async () => {
    const app = new Hono();
    registerCommunityRoutes(app, createTestAuthDeps('user', USER_A));

    const view = await app.request(`/community/channels/${TEST_SLUG_PREFIX}staff`, { method: 'GET' });
    assert.equal(view.status, 200);

    const create = await app.request(`/community/channels/${TEST_SLUG_PREFIX}staff/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bodyHtml: '<p>nope</p>', status: 'published' }),
    });
    assert.equal(create.status, 403);
  });

  it('staff_post: staff can create post', async () => {
    const app = new Hono();
    registerCommunityRoutes(app, createTestAuthDeps('manager', STAFF_ID));

    const create = await app.request(`/community/channels/${TEST_SLUG_PREFIX}staff/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bodyHtml: '<p>w10-http-created staff</p>', status: 'published' }),
    });
    assert.equal(create.status, 201);
  });

  it('entitlement_gated: track booking grants access', async () => {
    const appA = new Hono();
    registerCommunityRoutes(appA, createTestAuthDeps('user', USER_A));
    const ok = await appA.request(`/community/channels/${TEST_SLUG_PREFIX}track-gated`, { method: 'GET' });
    assert.equal(ok.status, 200);

    const appB = new Hono();
    registerCommunityRoutes(appB, createTestAuthDeps('user', USER_B));
    const denied = await appB.request(`/community/channels/${TEST_SLUG_PREFIX}track-gated`, { method: 'GET' });
    assert.equal(denied.status, 403);
  });

  it('entitlement_gated: masterclass enrollment grants access', async () => {
    const appB = new Hono();
    registerCommunityRoutes(appB, createTestAuthDeps('user', USER_B));
    const ok = await appB.request(`/community/channels/${TEST_SLUG_PREFIX}mc-gated`, { method: 'GET' });
    assert.equal(ok.status, 200);

    const appA = new Hono();
    registerCommunityRoutes(appA, createTestAuthDeps('user', USER_A));
    const denied = await appA.request(`/community/channels/${TEST_SLUG_PREFIX}mc-gated`, { method: 'GET' });
    assert.equal(denied.status, 403);
  });

  it('entitlement_gated OR: track OR masterclass allows access', async () => {
    const slug = `${TEST_SLUG_PREFIX}or-gated`;

    const appA = new Hono();
    registerCommunityRoutes(appA, createTestAuthDeps('user', USER_A));
    assert.equal((await appA.request(`/community/channels/${slug}`, { method: 'GET' })).status, 200);

    const appB = new Hono();
    registerCommunityRoutes(appB, createTestAuthDeps('user', USER_B));
    assert.equal((await appB.request(`/community/channels/${slug}`, { method: 'GET' })).status, 200);

    const appC = new Hono();
    registerCommunityRoutes(appC, createTestAuthDeps('user', USER_C));
    assert.equal((await appC.request(`/community/channels/${slug}`, { method: 'GET' })).status, 403);
  });

  it('entitlement_gated: denied user absent from channel list', async () => {
    const app = new Hono();
    registerCommunityRoutes(app, createTestAuthDeps('user', USER_C));
    const res = await app.request('/community/channels', { method: 'GET' });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { items: Array<{ slug: string }> };
    const slugs = body.items.map((i) => i.slug);
    assert.ok(!slugs.includes(`${TEST_SLUG_PREFIX}or-gated`));
  });

  it('archived channel hidden from members', async () => {
    const app = new Hono();
    registerCommunityRoutes(app, createTestAuthDeps('user', USER_A));

    const res = await app.request(`/community/channels/${TEST_SLUG_PREFIX}archived`, { method: 'GET' });
    assert.equal(res.status, 403);
  });

  it('cross-user: User B cannot PATCH User A post', async () => {
    const app = new Hono();
    registerCommunityRoutes(app, createTestAuthDeps('user', USER_B));

    const res = await app.request(`/community/posts/${POST_A}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bodyHtml: '<p>hijack</p>' }),
    });
    assert.equal(res.status, 403);
  });

  it('cross-user: User A can PATCH own post', async () => {
    const app = new Hono();
    registerCommunityRoutes(app, createTestAuthDeps('user', USER_A));

    const res = await app.request(`/community/posts/${POST_A}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bodyHtml: '<p>edited by A</p>' }),
    });
    assert.equal(res.status, 200);
  });

  it('pending/rejected posts hidden from member feed', async () => {
    const app = new Hono();
    registerCommunityRoutes(app, createTestAuthDeps('user', USER_B));

    const feed = await app.request(`/community/channels/${TEST_SLUG_PREFIX}open/feed`, { method: 'GET' });
    assert.equal(feed.status, 200);
    const body = (await feed.json()) as { posts: Array<{ id: string }> };
    const ids = body.posts.map((p) => p.id);
    assert.ok(ids.includes(POST_A));
    assert.ok(!ids.includes(POST_PENDING));
    assert.ok(!ids.includes(POST_REJECTED));
  });

  it('member cannot access pending list or approve', async () => {
    const app = new Hono();
    registerCommunityRoutes(app, createTestAuthDeps('user', USER_A));

    const list = await app.request('/community/admin/posts/pending', { method: 'GET' });
    assert.equal(list.status, 401);

    const approve = await app.request(`/community/posts/${POST_PENDING}/approve`, { method: 'POST' });
    assert.equal(approve.status, 401);
  });

  it('staff can list pending and approve', async () => {
    const app = new Hono();
    registerCommunityRoutes(app, createTestAuthDeps('manager', STAFF_ID));

    const list = await app.request('/community/admin/posts/pending', { method: 'GET' });
    assert.equal(list.status, 200);
    const pending = (await list.json()) as { items: Array<{ id: string }> };
    assert.ok(pending.items.some((p) => p.id === POST_PENDING));

    const approve = await app.request(`/community/posts/${POST_PENDING}/approve`, { method: 'POST' });
    assert.equal(approve.status, 200);
  });

  it('member cannot create announcements; staff can publish', async () => {
    const memberApp = new Hono();
    registerCommunityRoutes(memberApp, createTestAuthDeps('user', USER_A));
    const denied = await memberApp.request('/community/admin/announcements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titleEn: 'W10 X',
        titleAr: 'W10 X AR',
        bodyEn: '<p>x</p>',
        bodyAr: '<p>x</p>',
      }),
    });
    assert.equal(denied.status, 401);

    const staffApp = new Hono();
    registerCommunityRoutes(staffApp, createTestAuthDeps('manager', STAFF_ID));
    const created = await staffApp.request('/community/admin/announcements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titleEn: 'W10 HTTP Ann',
        titleAr: 'W10 HTTP Ann AR',
        bodyEn: '<p>ann</p>',
        bodyAr: '<p>ann</p>',
      }),
    });
    assert.equal(created.status, 201);
    const ann = (await created.json()) as { announcement: { id: string } };

    const publish = await staffApp.request(`/community/admin/announcements/${ann.announcement.id}/publish`, {
      method: 'POST',
    });
    assert.equal(publish.status, 200);
  });

  it('published announcement cannot be cancelled', async () => {
    const staffApp = new Hono();
    registerCommunityRoutes(staffApp, createTestAuthDeps('manager', STAFF_ID));
    const created = await staffApp.request('/community/admin/announcements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titleEn: 'W10 Cancel Test',
        titleAr: 'W10 Cancel AR',
        bodyEn: '<p>c</p>',
        bodyAr: '<p>c</p>',
      }),
    });
    const ann = (await created.json()) as { announcement: { id: string } };
    await staffApp.request(`/community/admin/announcements/${ann.announcement.id}/publish`, { method: 'POST' });
    const cancel = await staffApp.request(`/community/admin/announcements/${ann.announcement.id}/cancel`, {
      method: 'POST',
    });
    assert.equal(cancel.status, 409);
  });

  it('anonymous requests return 401', async () => {
    const app = new Hono();
    registerCommunityRoutes(app, createTestAuthDeps(null, null));

    const res = await app.request(`/community/channels/${TEST_SLUG_PREFIX}open`, { method: 'GET' });
    assert.equal(res.status, 401);
  });

  it('cross-user: User B cannot archive User A post', async () => {
    const app = new Hono();
    registerCommunityRoutes(app, createTestAuthDeps('user', USER_B));

    const res = await app.request(`/community/posts/${POST_A}/archive`, { method: 'POST' });
    assert.equal(res.status, 403);
  });

  it('author identity comes from session, not request body', async () => {
    const app = new Hono();
    registerCommunityRoutes(app, createTestAuthDeps('user', USER_B));

    const create = await app.request(`/community/channels/${TEST_SLUG_PREFIX}open-no-approval/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        bodyHtml: '<p>w10-http-created author-spoof</p>',
        status: 'published',
        authorUserId: USER_A,
      }),
    });
    assert.equal(create.status, 201);
    const body = (await create.json()) as { post: { author: { id: string } } };
    assert.equal(body.post.author.id, USER_B);
  });

  it('staff can reject pending post; rejected stays hidden from feed', async () => {
    const pendingId = 'e1000000-0000-4000-8000-000000000099';
    await db.delete(activityPosts).where(inArray(activityPosts.id, [pendingId]));
    await db.insert(activityPosts).values({
      id: pendingId,
      channelId: CH_OPEN,
      authorUserId: USER_A,
      bodyHtml: '<p>Reject me</p>',
      status: 'pending',
    });

    const staffApp = new Hono();
    registerCommunityRoutes(staffApp, createTestAuthDeps('manager', STAFF_ID));
    const reject = await staffApp.request(`/community/posts/${pendingId}/reject`, { method: 'POST' });
    assert.equal(reject.status, 200);

    const memberApp = new Hono();
    registerCommunityRoutes(memberApp, createTestAuthDeps('user', USER_B));
    const feed = await memberApp.request(`/community/channels/${TEST_SLUG_PREFIX}open/feed`, { method: 'GET' });
    const feedBody = (await feed.json()) as { posts: Array<{ id: string }> };
    assert.ok(!feedBody.posts.some((p) => p.id === pendingId));

    await db.delete(activityPosts).where(inArray(activityPosts.id, [pendingId]));
  });

  it('member cannot schedule announcements', async () => {
    const staffApp = new Hono();
    registerCommunityRoutes(staffApp, createTestAuthDeps('manager', STAFF_ID));
    const created = await staffApp.request('/community/admin/announcements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titleEn: 'W10 Schedule RBAC',
        titleAr: 'W10 Schedule RBAC AR',
        bodyEn: '<p>s</p>',
        bodyAr: '<p>s</p>',
      }),
    });
    const ann = (await created.json()) as { announcement: { id: string } };

    const memberApp = new Hono();
    registerCommunityRoutes(memberApp, createTestAuthDeps('user', USER_A));
    const schedule = await memberApp.request(
      `/community/admin/announcements/${ann.announcement.id}/schedule`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scheduledAt: '2099-01-01T12:00:00.000Z' }),
      },
    );
    assert.equal(schedule.status, 401);
  });
});
