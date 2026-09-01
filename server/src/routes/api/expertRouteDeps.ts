import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { experts, users } from '../../db/schema/index.js';
import {
  assertSlugAvailable,
  assertUserAssignmentAvailable,
  countEventExpertLinks,
  findExpertByAssignedUser,
  loadExpertSkillIds,
  loadExpertWithAssignee,
  loadPublicExpertEvents,
  replaceExpertSkills,
} from '../../services/experts.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { getOptionalUserRole, requireAdmin, requireManager } from './utils.js';

export type ExpertRow = typeof experts.$inferSelect;

export type ExpertRouteDeps = {
  requireManager: typeof requireManager;
  requireAdmin: typeof requireAdmin;
  getSessionFromRequest: typeof getSessionFromRequest;
  getOptionalUserRole: typeof getOptionalUserRole;
  findExpertByAssignedUser: typeof findExpertByAssignedUser;
  loadExpertSkillIds: typeof loadExpertSkillIds;
  replaceExpertSkills: typeof replaceExpertSkills;
  loadExpertWithAssignee: typeof loadExpertWithAssignee;
  countEventExpertLinks: typeof countEventExpertLinks;
  assertSlugAvailable: typeof assertSlugAvailable;
  assertUserAssignmentAvailable: typeof assertUserAssignmentAvailable;
  loadPublicExpertEvents: typeof loadPublicExpertEvents;
  loadExpertSkillsPublic: (
    expertId: string,
    locale: import('../../utils/locale.js').AppLocale,
    isStaff: boolean,
  ) => Promise<Array<{ id: string; category: string | null }>>;
  listExperts: (isStaff: boolean) => Promise<ExpertRow[]>;
  getExpertBySlug: (slug: string) => Promise<ExpertRow | undefined>;
  getExpertById: (id: string) => Promise<ExpertRow | undefined>;
  insertExpert: (values: Record<string, unknown>) => Promise<ExpertRow>;
  updateExpertById: (id: string, patch: Record<string, unknown>) => Promise<ExpertRow | undefined>;
  deleteExpertById: (id: string) => Promise<ExpertRow | undefined>;
  userExists: (userId: string) => Promise<boolean>;
};

export function createDefaultExpertRouteDeps(): ExpertRouteDeps {
  return {
    requireManager,
    requireAdmin,
    getSessionFromRequest,
    getOptionalUserRole,
    findExpertByAssignedUser,
    loadExpertSkillIds,
    replaceExpertSkills,
    loadExpertWithAssignee,
    countEventExpertLinks,
    assertSlugAvailable,
    assertUserAssignmentAvailable,
    loadPublicExpertEvents,
    listExperts: async (isStaff) =>
      isStaff
        ? db.select().from(experts).orderBy(asc(experts.displayNameEn))
        : db
            .select()
            .from(experts)
            .where(and(eq(experts.isPublished, true), isNull(experts.archivedAt)))
            .orderBy(asc(experts.displayNameEn)),
    getExpertBySlug: async (slug) => {
      const [row] = await db.select().from(experts).where(eq(experts.slug, slug)).limit(1);
      return row;
    },
    getExpertById: async (id) => {
      const [row] = await db.select().from(experts).where(eq(experts.id, id)).limit(1);
      return row;
    },
    insertExpert: async (values) => {
      const [created] = await db.insert(experts).values(values as never).returning();
      return created;
    },
    updateExpertById: async (id, patch) => {
      const [updated] = await db
        .update(experts)
        .set(patch as never)
        .where(eq(experts.id, id))
        .returning();
      return updated;
    },
    deleteExpertById: async (id) => {
      const [deleted] = await db.delete(experts).where(eq(experts.id, id)).returning();
      return deleted;
    },
    userExists: async (userId) => {
      const rows = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
      return rows.length > 0;
    },
    loadExpertSkillsPublic: async () => [],
  };
}
