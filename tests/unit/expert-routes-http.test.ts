import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Hono } from 'hono';
import type { ExpertRow } from '../../server/src/routes/api/expertRouteDeps.ts';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/trafficmena_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-value-with-at-least-32-characters';

const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER_UNASSIGNED = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const EXPERT_PUBLISHED = '11111111-1111-1111-1111-111111111111';
const EXPERT_DRAFT = '22222222-2222-2222-2222-222222222222';
const EXPERT_ARCHIVED = '33333333-3333-3333-3333-333333333333';
const EXPERT_ASSIGNED_A = '44444444-4444-4444-4444-444444444444';

function baseExpert(overrides: Partial<ExpertRow>): ExpertRow {
  return {
    id: EXPERT_DRAFT,
    slug: 'draft-expert',
    displayName: 'Draft Expert',
    displayNameEn: 'Draft Expert',
    displayNameAr: 'خبير مسودة',
    headlineEn: 'Headline EN',
    headlineAr: 'عنوان AR',
    bioEn: '<p>Bio EN</p>',
    bioAr: '<p>Bio AR</p>',
    avatarUrl: 'https://example.com/a.jpg',
    websiteUrl: 'https://example.com',
    linkedinUrl: 'https://linkedin.com/in/test',
    twitterUrl: null,
    assignedUserId: null,
    isPublished: false,
    publishedAt: null,
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as ExpertRow;
}

function createMemoryStore(initial: ExpertRow[]) {
  const rows = new Map(initial.map((row) => [row.id, structuredClone(row)]));

  return {
    listExperts: async (isStaff: boolean) => {
      const all = [...rows.values()];
      return isStaff
        ? all.sort((a, b) => a.displayNameEn.localeCompare(b.displayNameEn))
        : all
            .filter((row) => row.isPublished && row.archivedAt == null)
            .sort((a, b) => a.displayNameEn.localeCompare(b.displayNameEn));
    },
    getExpertBySlug: async (slug: string) => [...rows.values()].find((row) => row.slug === slug),
    getExpertById: async (id: string) => rows.get(id),
    insertExpert: async (values: Record<string, unknown>) => {
      const id = (values.id as string) ?? crypto.randomUUID();
      const created = baseExpert({
        id,
        slug: String(values.slug),
        displayNameEn: String(values.displayNameEn ?? values.display_name_en ?? 'New Expert'),
        displayNameAr: String(values.displayNameAr ?? values.display_name_ar ?? 'خبير'),
        isPublished: Boolean(values.isPublished),
        publishedAt: (values.publishedAt as Date | null) ?? null,
        assignedUserId: (values.assignedUserId as string | null) ?? null,
      });
      rows.set(id, created);
      return created;
    },
    updateExpertById: async (id: string, patch: Record<string, unknown>) => {
      const existing = rows.get(id);
      if (!existing) return undefined;
      const updated = { ...existing, ...patch } as ExpertRow;
      rows.set(id, updated);
      return updated;
    },
    deleteExpertById: async (id: string) => {
      const existing = rows.get(id);
      if (!existing) return undefined;
      rows.delete(id);
      return existing;
    },
    findExpertByAssignedUser: async (userId: string) =>
      [...rows.values()].find((row) => row.assignedUserId === userId) ?? null,
    userExists: async (userId: string) => userId === USER_A || userId === USER_B,
    loadExpertSkillIds: async () => [],
    replaceExpertSkills: async () => {},
    loadExpertWithAssignee: async (id: string) => {
      const expert = rows.get(id);
      if (!expert) return null;
      return { expert, assignedUserEmail: expert.assignedUserId ? 'assigned@example.com' : null };
    },
    countEventExpertLinks: async () => 0,
    assertSlugAvailable: async () => true,
    assertUserAssignmentAvailable: async (userId: string, excludeExpertId?: string) => {
      const conflict = [...rows.values()].find(
        (row) => row.assignedUserId === userId && row.id !== excludeExpertId,
      );
      return !conflict;
    },
    loadPublicExpertEvents: async () => [],
    loadExpertSkillsPublic: async () => [],
  };
}
function authDeps(role: string | null, userId: string | null = null) {
  return {
    requireManager: async (c: { json: (body: unknown, status: number) => Response }) => {
      if (!role || !['owner', 'admin', 'manager'].includes(role)) {
        return {
          response: c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, 401),
        };
      }
      return { userId: userId ?? USER_A, role };
    },
    requireAdmin: async (c: { json: (body: unknown, status: number) => Response }) => {
      if (!role || !['owner', 'admin'].includes(role)) {
        return {
          response: c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, 401),
        };
      }
      return { userId: userId ?? USER_A, role };
    },
    getSessionFromRequest: async () =>
      userId ? { user: { id: userId, email: `${userId}@example.com` } } : null,
    getOptionalUserRole: async () => role,
  };
}

const { registerExpertRoutes } = await import('../../server/src/routes/api/experts.ts');

describe('expert routes HTTP authorization', () => {
  const seed = [
    baseExpert({
      id: EXPERT_PUBLISHED,
      slug: 'published-expert',
      displayNameEn: 'Published Expert',
      displayNameAr: 'خبير منشور',
      isPublished: true,
      publishedAt: new Date('2026-01-02T00:00:00.000Z'),
    }),
    baseExpert({
      id: EXPERT_DRAFT,
      slug: 'draft-expert',
      displayNameEn: 'Draft Expert',
    }),
    baseExpert({
      id: EXPERT_ARCHIVED,
      slug: 'archived-expert',
      displayNameEn: 'Archived Expert',
      archivedAt: new Date('2026-02-01T00:00:00.000Z'),
      assignedUserId: USER_B,
    }),
    baseExpert({
      id: EXPERT_ASSIGNED_A,
      slug: 'assigned-a',
      displayNameEn: 'Assigned Expert A',
      displayNameAr: 'خبير A',
      isPublished: true,
      publishedAt: new Date('2026-01-03T00:00:00.000Z'),
      assignedUserId: USER_A,
    }),
  ];

  it('rejects normal user admin mutations', async () => {
    const store = createMemoryStore(seed);
    const app = new Hono();
    registerExpertRoutes(app, {
      ...authDeps('user', USER_B),
      ...store,
    });

    const routes: Array<[string, string]> = [
      ['POST', '/experts'],
      ['PUT', `/experts/${EXPERT_DRAFT}`],
      ['POST', `/experts/${EXPERT_DRAFT}/publish`],
      ['POST', `/experts/${EXPERT_DRAFT}/unpublish`],
      ['POST', `/experts/${EXPERT_DRAFT}/archive`],
      ['POST', `/experts/${EXPERT_DRAFT}/restore`],
      ['PUT', `/experts/${EXPERT_DRAFT}/assign-user`],
    ];

    for (const [method, path] of routes) {
      const response = await app.request(path, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayNameEn: 'X', displayNameAr: 'X' }),
      });
      assert.equal(response.status, 401, `${method} ${path} should be denied`);
    }
  });

  it('allows manager create/edit/publish lifecycle', async () => {
    const store = createMemoryStore(seed);
    const app = new Hono();
    registerExpertRoutes(app, {
      ...authDeps('manager', USER_A),
      ...store,
    });

    const createResponse = await app.request('/experts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayNameEn: 'Manager Created',
        displayNameAr: 'أنشأه المدير',
      }),
    });
    assert.equal(createResponse.status, 201);

    const publishResponse = await app.request(`/experts/${EXPERT_DRAFT}/publish`, { method: 'POST' });
    assert.equal(publishResponse.status, 200);
    const publishBody = await publishResponse.json();
    assert.equal(publishBody.expert.isPublished, true);
  });

  it('allows admin delete but manager delete requires admin', async () => {
    const store = createMemoryStore(seed);
    const managerApp = new Hono();
    registerExpertRoutes(managerApp, { ...authDeps('manager', USER_A), ...store });

    const adminApp = new Hono();
    registerExpertRoutes(adminApp, { ...authDeps('admin', USER_A), ...store });

    const managerDelete = await managerApp.request(`/experts/${EXPERT_DRAFT}`, { method: 'DELETE' });
    assert.equal(managerDelete.status, 401);

    const adminDelete = await adminApp.request(`/experts/${EXPERT_DRAFT}`, { method: 'DELETE' });
    assert.equal(adminDelete.status, 200);
  });

  it('assigned user can GET/PATCH own profile but not lifecycle fields', async () => {
    const store = createMemoryStore(seed);
    const app = new Hono();
    registerExpertRoutes(app, {
      ...authDeps('user', USER_A),
      ...store,
    });

    const getResponse = await app.request('/me/expert-profile');
    assert.equal(getResponse.status, 200);
    const getBody = await getResponse.json();
    assert.equal(getBody.expert.id, EXPERT_ASSIGNED_A);
    assert.equal(getBody.canEdit, true);

    const patchResponse = await app.request('/me/expert-profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayNameEn: 'Updated A',
        displayNameAr: 'محدث A',
        headlineEn: 'New headline',
        bioEn: '<p>Safe bio</p>',
        avatarUrl: 'https://example.com/new.jpg',
        linkedinUrl: 'https://linkedin.com/in/updated',
      }),
    });
    assert.equal(patchResponse.status, 200);
    const patchBody = await patchResponse.json();
    assert.equal(patchBody.expert.displayNameEn, 'Updated A');
    assert.equal(patchBody.expert.slug, 'assigned-a');
  });

  it('assigned user cannot mutate another expert via admin routes', async () => {
    const store = createMemoryStore(seed);
    const app = new Hono();
    registerExpertRoutes(app, {
      ...authDeps('user', USER_A),
      ...store,
    });

    const response = await app.request(`/experts/${EXPERT_PUBLISHED}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayNameEn: 'Hack', displayNameAr: 'Hack' }),
    });
    assert.equal(response.status, 401);
  });

  it('unassigned user GET/PATCH /me/expert-profile returns 404', async () => {
    const store = createMemoryStore(seed);
    const app = new Hono();
    registerExpertRoutes(app, {
      ...authDeps('user', USER_UNASSIGNED),
      ...store,
    });

    const getResponse = await app.request('/me/expert-profile');
    assert.equal(getResponse.status, 404);
    const patchResponse = await app.request('/me/expert-profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayNameEn: 'Nope', displayNameAr: 'Nope' }),
    });
    assert.equal(patchResponse.status, 404);
  });

  it('archived assigned user can GET but PATCH is forbidden', async () => {
    const store = createMemoryStore(seed);
    const app = new Hono();
    registerExpertRoutes(app, {
      ...authDeps('user', USER_B),
      ...store,
    });

    const getResponse = await app.request('/me/expert-profile');
    assert.equal(getResponse.status, 200);
    const getBody = await getResponse.json();
    assert.equal(getBody.canEdit, false);

    const patchResponse = await app.request('/me/expert-profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayNameEn: 'Blocked', displayNameAr: 'Blocked' }),
    });
    assert.equal(patchResponse.status, 403);
  });

  it('public list/detail hides draft and archived experts', async () => {
    const store = createMemoryStore(seed);
    const app = new Hono();
    registerExpertRoutes(app, {
      ...authDeps(null, null),
      ...store,
    });

    const listResponse = await app.request('/experts?lang=en');
    assert.equal(listResponse.status, 200);
    const listBody = await listResponse.json();
    assert.equal(listBody.items.length, 2);
    assert.ok(listBody.items.every((item: Record<string, unknown>) => item.slug === 'published-expert' || item.slug === 'assigned-a'));
    assert.ok(listBody.items.every((item: Record<string, unknown>) => !('assignedUserId' in item)));
    assert.ok(listBody.items.every((item: Record<string, unknown>) => !('displayNameEn' in item)));

    const draftSlugResponse = await app.request('/experts/s/draft-expert?lang=en');
    assert.equal(draftSlugResponse.status, 404);
    const archivedSlugResponse = await app.request('/experts/s/archived-expert?lang=en');
    assert.equal(archivedSlugResponse.status, 404);

    const publishedSlugResponse = await app.request('/experts/s/published-expert?lang=en');
    assert.equal(publishedSlugResponse.status, 200);
    const publishedBody = await publishedSlugResponse.json();
    assert.equal(publishedBody.expert.displayName, 'Published Expert');
    assert.equal(publishedBody.expert.slug, 'published-expert');
    assert.equal('assignedUserId' in publishedBody.expert, false);
    assert.equal('displayNameEn' in publishedBody.expert, false);
  });

  it('public expert locale resolves localized fields only', async () => {
    const store = createMemoryStore(seed);
    const app = new Hono();
    registerExpertRoutes(app, {
      ...authDeps(null, null),
      ...store,
    });

    const enResponse = await app.request('/experts/s/published-expert?lang=en');
    const enBody = await enResponse.json();
    assert.equal(enBody.expert.displayName, 'Published Expert');

    const arResponse = await app.request('/experts/s/published-expert?lang=ar');
    const arBody = await arResponse.json();
    assert.equal(arBody.expert.displayName, 'خبير منشور');
  });
});
