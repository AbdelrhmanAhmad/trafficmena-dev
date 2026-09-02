import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Hono } from 'hono';
import type { ExpertRow } from '../../server/src/routes/api/expertRouteDeps.ts';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const EXPERT_PUBLISHED = '11111111-1111-1111-1111-111111111111';
const TRACK_PUBLISHED = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TRACK_DRAFT = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const MC_PUBLISHED = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function baseExpert(overrides: Partial<ExpertRow>): ExpertRow {
  return {
    id: EXPERT_PUBLISHED,
    slug: 'published-expert',
    displayName: 'Published Expert',
    displayNameEn: 'Published Expert',
    displayNameAr: 'خبير',
    headlineEn: null,
    headlineAr: null,
    bioEn: null,
    bioAr: null,
    avatarUrl: null,
    websiteUrl: null,
    linkedinUrl: null,
    twitterUrl: null,
    assignedUserId: null,
    isPublished: true,
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as ExpertRow;
}

function createSlugDeps(options: {
  isStaff?: boolean;
  linked?: {
    events?: Array<{ id: string; titleEn: string; titleAr: string; date: Date; imageUrl: string | null }>;
    tracks?: Array<{ id: string; titleEn: string; titleAr: string; imageUrl: string | null }>;
    series?: Array<{ id: string; titleEn: string; titleAr: string; imageUrl: string | null }>;
    masterclasses?: Array<{ id: string; titleEn: string; titleAr: string; imageUrl: string | null }>;
    libraryAssets?: Array<{ id: string; titleEn: string; titleAr: string; imageUrl: string | null }>;
  };
}) {
  const expert = baseExpert({});
  const linked = options.linked ?? {};

  return {
    requireManager: async (c: { json: (body: unknown, status: number) => Response }) =>
      c.json({ error: { code: 'UNAUTHORIZED' } }, 401),
    requireAdmin: async (c: { json: (body: unknown, status: number) => Response }) =>
      c.json({ error: { code: 'UNAUTHORIZED' } }, 401),
    getSessionFromRequest: async () => (options.isStaff ? { user: { id: 'staff-user' } } : null),
    getOptionalUserRole: async () => (options.isStaff ? 'manager' : null),
    listExperts: async () => [expert],
    getExpertBySlug: async () => expert,
    getExpertById: async () => expert,
    insertExpert: async () => expert,
    updateExpertById: async () => expert,
    deleteExpertById: async () => expert,
    findExpertByAssignedUser: async () => null,
    userExists: async () => true,
    loadExpertSkillIds: async () => [],
    replaceExpertSkills: async () => {},
    loadExpertWithAssignee: async () => ({ expert, assignedUserEmail: null }),
    countExpertContentLinks: async () => 0,
    countEventExpertLinks: async () => 0,
    assertSlugAvailable: async () => true,
    assertUserAssignmentAvailable: async () => true,
    loadPublicExpertEvents: async () => linked.events ?? [],
    loadPublicExpertLinkedContent: async () => ({
      events: linked.events ?? [],
      tracks: linked.tracks ?? [],
      series: linked.series ?? [],
      masterclasses: linked.masterclasses ?? [],
      libraryAssets: linked.libraryAssets ?? [],
    }),
    loadExpertSkillsPublic: async () => [],
  };
}

const { registerExpertRoutes } = await import('../../server/src/routes/api/experts.ts');

describe('expert linked content slug API', () => {
  it('returns published tracks only in public slug payload shape', async () => {
    const app = new Hono();
    registerExpertRoutes(app, {
      ...createSlugDeps({
        linked: {
          tracks: [
            {
              id: TRACK_PUBLISHED,
              titleEn: 'Published Track',
              titleAr: 'مسار',
              imageUrl: 'https://example.com/track.jpg',
            },
          ],
          series: [],
          masterclasses: [],
          libraryAssets: [],
          events: [],
        },
      }),
    });

    const response = await app.request('/experts/s/published-expert?lang=en');
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(Array.isArray(body.tracks));
    assert.equal(body.tracks.length, 1);
    assert.equal(body.tracks[0].id, TRACK_PUBLISHED);
    assert.equal(body.tracks[0].title, 'Published Track');
    assert.equal(body.tracks[0].imageUrl, 'https://example.com/track.jpg');
    assert.ok(Array.isArray(body.series));
    assert.ok(Array.isArray(body.masterclasses));
    assert.ok(Array.isArray(body.libraryAssets));
    assert.ok(Array.isArray(body.events));
  });

  it('hides masterclasses on public slug when discovery is blocked via loader deps', async () => {
    const app = new Hono();
    registerExpertRoutes(app, {
      ...createSlugDeps({
        linked: {
          masterclasses: [
            {
              id: MC_PUBLISHED,
              titleEn: 'Hidden MC',
              titleAr: 'MC',
              imageUrl: null,
            },
          ],
        },
      }),
      loadPublicExpertLinkedContent: async () => ({
        events: [],
        tracks: [],
        series: [],
        masterclasses: [],
        libraryAssets: [],
      }),
    });

    const response = await app.request('/experts/s/published-expert?lang=en');
    const body = await response.json();
    assert.equal(body.masterclasses.length, 0);
  });

  it('staff viewing draft expert receives linked sections from loader', async () => {
    const draft = baseExpert({ id: 'draft-id', slug: 'draft-expert', isPublished: false });
    const app = new Hono();
    registerExpertRoutes(app, {
      ...createSlugDeps({
        isStaff: true,
        linked: {
          tracks: [
            {
              id: TRACK_DRAFT,
              titleEn: 'Draft Track',
              titleAr: 'مسودة',
              imageUrl: null,
            },
          ],
        },
      }),
      getExpertBySlug: async () => draft,
    });

    const response = await app.request('/experts/s/draft-expert?lang=en');
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.tracks.length, 1);
    assert.equal(body.tracks[0].title, 'Draft Track');
    assert.equal(body.events.length, 0);
  });

  it('delete expert uses countExpertContentLinks across all junction tables', async () => {
    let contentLinks = 2;
    const app = new Hono();
    registerExpertRoutes(app, {
      ...createSlugDeps({ isStaff: true }),
      requireAdmin: async () => ({ userId: 'admin', role: 'admin' }),
      countExpertContentLinks: async () => contentLinks,
    });

    const blocked = await app.request(`/experts/${EXPERT_PUBLISHED}`, { method: 'DELETE' });
    assert.equal(blocked.status, 409);
    const blockedBody = await blocked.json();
    assert.equal(blockedBody.error.code, 'EXPERT_IN_USE');

    contentLinks = 0;
    const allowed = await app.request(`/experts/${EXPERT_PUBLISHED}`, { method: 'DELETE' });
    assert.equal(allowed.status, 200);
  });

  it('public slug includes series and library asset title fields', async () => {
    const app = new Hono();
    registerExpertRoutes(app, {
      ...createSlugDeps({
        linked: {
          series: [
            {
              id: 'series-1',
              titleEn: 'Series One',
              titleAr: 'سلسلة',
              imageUrl: null,
            },
          ],
          libraryAssets: [
            {
              id: 'asset-1',
              titleEn: 'Guide',
              titleAr: 'دليل',
              imageUrl: 'https://example.com/thumb.jpg',
            },
          ],
        },
      }),
    });

    const response = await app.request('/experts/s/published-expert?lang=ar');
    const body = await response.json();
    assert.equal(body.series[0].title, 'سلسلة');
    assert.equal(body.libraryAssets[0].title, 'دليل');
  });
});
