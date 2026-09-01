import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Context, Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import {
  activityAnnouncements,
  activityChannelEntitlements,
  activityChannels,
  activityPosts,
  users,
} from '../../db/schema/index.js';
import { getPublishedAnnouncementsForChannels } from '../../services/community/announcements.js';
import {
  filterAccessibleChannelIds,
  isStaffRole,
  loadChannelEntitlements,
  userCanPostInChannel,
  userCanViewChannel,
} from '../../services/community/access.js';
import {
  COMMUNITY_POST_BODY_MAX,
  COMMUNITY_POST_TITLE_MAX,
  sanitizeExternalUrl,
  sanitizePlainText,
  sanitizeRichTextHtml,
  slugifyChannel,
} from '../../utils/communityContent.js';
import {
  presentAdminAnnouncement,
  presentAdminChannel,
  presentAnnouncement,
  presentChannel,
  presentPost,
} from '../../utils/communityPresentation.js';
import { ApiError, handleRoute } from '../../utils/errors.js';
import { resolveLocaleFromRequest } from '../../utils/locale.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { consumeRateLimit, getOptionalUserRole, requireManager } from './utils.js';

const POST_RATE_LIMIT = { limit: 20, windowMs: 60_000 };
const uuidParamSchema = z.string().uuid();
const slugParamSchema = z.string().trim().min(1).max(120);

function requireUuidParam(c: Context, name: string): string {
  const parsed = uuidParamSchema.safeParse(c.req.param(name));
  if (!parsed.success) throw new ApiError('INVALID_REQUEST', `Invalid ${name}.`, 400);
  return parsed.data;
}

function requireSlugParam(c: Context): string {
  const parsed = slugParamSchema.safeParse(c.req.param('slug'));
  if (!parsed.success) throw new ApiError('INVALID_REQUEST', 'Invalid channel slug.', 400);
  return parsed.data;
}

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const entitlementSchema = z.object({
  trackId: z.string().uuid().optional().nullable(),
  masterclassId: z.string().uuid().optional().nullable(),
});

const createChannelSchema = z.object({
  nameEn: z.string().trim().min(1).max(180),
  nameAr: z.string().trim().min(1).max(180),
  descriptionEn: z.string().max(5000).optional().nullable(),
  descriptionAr: z.string().max(5000).optional().nullable(),
  channelType: z.enum(['staff_post', 'entitlement_gated', 'open']),
  coverImageUrl: z.string().trim().url(),
  requiresApproval: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  entitlements: z.array(entitlementSchema).max(20).optional(),
});

const updateChannelSchema = createChannelSchema.partial();

const postBodySchema = z.object({
  title: z.string().trim().max(COMMUNITY_POST_TITLE_MAX).optional().nullable(),
  bodyHtml: z.string().max(COMMUNITY_POST_BODY_MAX),
  localeHint: z.enum(['en', 'ar']).optional().nullable(),
  linkUrl: z.string().trim().max(2048).optional().nullable(),
  imageUrl: z.string().trim().url().optional().nullable(),
  status: z.enum(['draft', 'published']).optional(),
});

const announcementBodySchema = z.object({
  channelId: z.string().uuid().optional().nullable(),
  titleEn: z.string().trim().min(1).max(180),
  titleAr: z.string().trim().min(1).max(180),
  bodyEn: z.string().max(COMMUNITY_POST_BODY_MAX),
  bodyAr: z.string().max(COMMUNITY_POST_BODY_MAX),
});

async function requireAuthUser(c: Context) {
  const session = await getSessionFromRequest(c);
  if (!session?.user) {
    throw new ApiError('UNAUTHORIZED', 'Authentication required.', 401);
  }
  const role = await getOptionalUserRole(session.user.id);
  return { session, role, userId: session.user.id, isStaff: isStaffRole(role) };
}

async function getChannelBySlug(slug: string) {
  const [row] = await db.select().from(activityChannels).where(eq(activityChannels.slug, slug)).limit(1);
  return row ?? null;
}

async function loadAuthor(userId: string) {
  const [row] = await db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? { id: userId, name: 'Member', image: null };
}

function mapSanitizedPostInput(data: z.infer<typeof postBodySchema>) {
  return {
    title: sanitizePlainText(data.title, COMMUNITY_POST_TITLE_MAX),
    bodyHtml: sanitizeRichTextHtml(data.bodyHtml) ?? '',
    localeHint: data.localeHint ?? null,
    linkUrl: sanitizeExternalUrl(data.linkUrl),
    imageUrl: sanitizeExternalUrl(data.imageUrl),
  };
}

function mapSanitizedAnnouncementInput(data: z.infer<typeof announcementBodySchema>) {
  return {
    channelId: data.channelId ?? null,
    titleEn: sanitizePlainText(data.titleEn, 180) ?? '',
    titleAr: sanitizePlainText(data.titleAr, 180) ?? '',
    bodyEn: sanitizeRichTextHtml(data.bodyEn) ?? '',
    bodyAr: sanitizeRichTextHtml(data.bodyAr) ?? '',
  };
}

async function assertSlugAvailable(slug: string, excludeId?: string) {
  const rows = await db
    .select({ id: activityChannels.id })
    .from(activityChannels)
    .where(eq(activityChannels.slug, slug))
    .limit(1);
  if (rows.length === 0) return true;
  return excludeId ? rows[0].id === excludeId : false;
}

async function replaceChannelEntitlements(
  channelId: string,
  entitlements: Array<{ trackId?: string | null; masterclassId?: string | null }>,
) {
  await db.delete(activityChannelEntitlements).where(eq(activityChannelEntitlements.channelId, channelId));
  if (entitlements.length === 0) return;
  await db.insert(activityChannelEntitlements).values(
    entitlements.map((ent) => ({
      channelId,
      trackId: ent.trackId ?? null,
      masterclassId: ent.masterclassId ?? null,
    })),
  );
}

function resolvePostStatus(params: {
  requested: 'draft' | 'published' | undefined;
  requiresApproval: boolean;
  isStaff: boolean;
}) {
  if (params.requested === 'draft' || !params.requested) return 'draft' as const;
  if (params.requiresApproval && !params.isStaff) return 'pending' as const;
  return 'published' as const;
}

export function registerCommunityRoutes(app: Hono) {
  app.get(
    '/community/channels',
    handleRoute(async (c) => {
      const { userId, role, isStaff } = await requireAuthUser(c);
      const locale = resolveLocaleFromRequest(c);

      const rows = isStaff
        ? await db.select().from(activityChannels).orderBy(asc(activityChannels.sortOrder), asc(activityChannels.nameEn))
        : await db
            .select()
            .from(activityChannels)
            .where(isNull(activityChannels.archivedAt))
            .orderBy(asc(activityChannels.sortOrder), asc(activityChannels.nameEn));

      const accessible = await filterAccessibleChannelIds({
        userId,
        role,
        channels: rows.map((row) => ({
          id: row.id,
          channelType: row.channelType,
          archivedAt: row.archivedAt,
        })),
      });

      const items = rows
        .filter((row) => accessible.has(row.id))
        .map((row) => presentChannel(row, locale, isStaff));

      return c.json({ items });
    }, 'COMMUNITY_CHANNELS_FAILED', 'Unable to load channels.', 'list community channels'),
  );

  app.get(
    '/community/channels/:slug',
    handleRoute(async (c) => {
      const { userId, role, isStaff } = await requireAuthUser(c);
      const locale = resolveLocaleFromRequest(c);
      const channel = await getChannelBySlug(requireSlugParam(c));
      if (!channel) throw new ApiError('NOT_FOUND', 'Channel not found.', 404);

      const canView = await userCanViewChannel({
        channel: {
          id: channel.id,
          channelType: channel.channelType,
          archivedAt: channel.archivedAt,
        },
        userId,
        role,
      });
      if (!canView) throw new ApiError('FORBIDDEN', 'You do not have access to this channel.', 403);

      const canPost = await userCanPostInChannel({
        channel: {
          id: channel.id,
          channelType: channel.channelType,
          archivedAt: channel.archivedAt,
        },
        userId,
        role,
      });

      return c.json({
        channel: presentChannel(channel, locale, isStaff),
        canPost,
      });
    }, 'COMMUNITY_CHANNEL_FAILED', 'Unable to load channel.', 'get community channel'),
  );

  app.get(
    '/community/channels/:slug/feed',
    handleRoute(async (c) => {
      const { userId, role, isStaff } = await requireAuthUser(c);
      const locale = resolveLocaleFromRequest(c);
      const parsed = paginationSchema.safeParse({
        page: c.req.query('page'),
        pageSize: c.req.query('pageSize'),
      });
      if (!parsed.success) throw new ApiError('INVALID_REQUEST', parsed.error.message, 400);

      const channel = await getChannelBySlug(requireSlugParam(c));
      if (!channel) throw new ApiError('NOT_FOUND', 'Channel not found.', 404);

      const canView = await userCanViewChannel({
        channel: {
          id: channel.id,
          channelType: channel.channelType,
          archivedAt: channel.archivedAt,
        },
        userId,
        role,
      });
      if (!canView) throw new ApiError('FORBIDDEN', 'You do not have access to this channel.', 403);

      const { page, pageSize } = parsed.data;
      const offset = (page - 1) * pageSize;

      const visibilityFilter = isStaff
        ? sql`true`
        : sql`(
            ${activityPosts.status} = 'published'
            OR (${activityPosts.authorUserId} = ${userId} AND ${activityPosts.status} IN ('draft', 'pending'))
          )`;

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(activityPosts)
        .where(
          and(
            eq(activityPosts.channelId, channel.id),
            isNull(activityPosts.archivedAt),
            visibilityFilter,
          ),
        );

      const postRows = await db
        .select()
        .from(activityPosts)
        .where(
          and(
            eq(activityPosts.channelId, channel.id),
            isNull(activityPosts.archivedAt),
            visibilityFilter,
          ),
        )
        .orderBy(desc(activityPosts.isPinned), desc(activityPosts.publishedAt), desc(activityPosts.createdAt))
        .limit(pageSize)
        .offset(offset);

      const authorIds = [...new Set(postRows.map((row) => row.authorUserId))];
      const authors =
        authorIds.length > 0
          ? await db
              .select({ id: users.id, name: users.name, image: users.image })
              .from(users)
              .where(inArray(users.id, authorIds))
          : [];
      const authorMap = new Map(authors.map((a) => [a.id, a]));

      const announcements = await getPublishedAnnouncementsForChannels([channel.id]);

      return c.json({
        posts: postRows.map((row) =>
          presentPost(row, authorMap.get(row.authorUserId) ?? { id: row.authorUserId, name: 'Member', image: null }, isStaff),
        ),
        announcements: announcements.map((row) => presentAnnouncement(row, locale, isStaff)),
        pagination: { page, pageSize, total: Number(count ?? 0) },
      });
    }, 'COMMUNITY_FEED_FAILED', 'Unable to load channel feed.', 'get community feed'),
  );

  app.post(
    '/community/channels/:slug/posts',
    handleRoute(async (c) => {
      const { userId, role, isStaff } = await requireAuthUser(c);
      const rateLimited = consumeRateLimit(c, `community:post:${userId}`, POST_RATE_LIMIT);
      if (rateLimited) return rateLimited;

      const channel = await getChannelBySlug(requireSlugParam(c));
      if (!channel) throw new ApiError('NOT_FOUND', 'Channel not found.', 404);

      const canPost = await userCanPostInChannel({
        channel: {
          id: channel.id,
          channelType: channel.channelType,
          archivedAt: channel.archivedAt,
        },
        userId,
        role,
      });
      if (!canPost) throw new ApiError('FORBIDDEN', 'You cannot post in this channel.', 403);

      const body = postBodySchema.safeParse(await c.req.json().catch(() => ({})));
      if (!body.success) throw new ApiError('INVALID_REQUEST', body.error.message, 400);

      const sanitized = mapSanitizedPostInput(body.data);
      const status = resolvePostStatus({
        requested: body.data.status,
        requiresApproval: channel.requiresApproval,
        isStaff,
      });

      const [created] = await db
        .insert(activityPosts)
        .values({
          channelId: channel.id,
          authorUserId: userId,
          ...sanitized,
          status,
          publishedAt: status === 'published' ? new Date() : null,
        })
        .returning();

      const author = await loadAuthor(userId);
      return c.json({ post: presentPost(created, author, isStaff) }, 201);
    }, 'COMMUNITY_POST_CREATE_FAILED', 'Unable to create post.', 'create community post'),
  );

  app.patch(
    '/community/posts/:id',
    handleRoute(async (c) => {
      const { userId, role, isStaff } = await requireAuthUser(c);
      const postId = requireUuidParam(c, 'id');

      const [existing] = await db.select().from(activityPosts).where(eq(activityPosts.id, postId)).limit(1);
      if (!existing) throw new ApiError('NOT_FOUND', 'Post not found.', 404);
      if (existing.archivedAt && !isStaff) throw new ApiError('FORBIDDEN', 'Archived posts cannot be edited.', 403);
      if (!isStaff && existing.authorUserId !== userId) {
        throw new ApiError('FORBIDDEN', 'You can only edit your own posts.', 403);
      }

      const body = postBodySchema.partial().safeParse(await c.req.json().catch(() => ({})));
      if (!body.success) throw new ApiError('INVALID_REQUEST', body.error.message, 400);

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (body.data.title !== undefined) patch.title = sanitizePlainText(body.data.title, COMMUNITY_POST_TITLE_MAX);
      if (body.data.bodyHtml !== undefined) patch.bodyHtml = sanitizeRichTextHtml(body.data.bodyHtml) ?? '';
      if (body.data.localeHint !== undefined) patch.localeHint = body.data.localeHint;
      if (body.data.linkUrl !== undefined) patch.linkUrl = sanitizeExternalUrl(body.data.linkUrl);
      if (body.data.imageUrl !== undefined) patch.imageUrl = sanitizeExternalUrl(body.data.imageUrl);

      if (body.data.status === 'published' && existing.status === 'draft') {
        const [channel] = await db
          .select({ requiresApproval: activityChannels.requiresApproval })
          .from(activityChannels)
          .where(eq(activityChannels.id, existing.channelId))
          .limit(1);
        const nextStatus = resolvePostStatus({
          requested: 'published',
          requiresApproval: channel?.requiresApproval ?? true,
          isStaff,
        });
        patch.status = nextStatus;
        patch.publishedAt = nextStatus === 'published' ? new Date() : null;
      }

      const [updated] = await db
        .update(activityPosts)
        .set(patch)
        .where(eq(activityPosts.id, postId))
        .returning();

      const author = await loadAuthor(updated.authorUserId);
      return c.json({ post: presentPost(updated, author, isStaff) });
    }, 'COMMUNITY_POST_UPDATE_FAILED', 'Unable to update post.', 'update community post'),
  );

  app.post(
    '/community/posts/:id/archive',
    handleRoute(async (c) => {
      const { userId, isStaff } = await requireAuthUser(c);
      const postId = requireUuidParam(c, 'id');
      const [existing] = await db.select().from(activityPosts).where(eq(activityPosts.id, postId)).limit(1);
      if (!existing) throw new ApiError('NOT_FOUND', 'Post not found.', 404);
      if (!isStaff && existing.authorUserId !== userId) {
        throw new ApiError('FORBIDDEN', 'You can only archive your own posts.', 403);
      }

      const [updated] = await db
        .update(activityPosts)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(activityPosts.id, postId))
        .returning();

      const author = await loadAuthor(updated.authorUserId);
      return c.json({ post: presentPost(updated, author, isStaff) });
    }, 'COMMUNITY_POST_ARCHIVE_FAILED', 'Unable to archive post.', 'archive community post'),
  );

  app.post(
    '/community/posts/:id/approve',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const postId = requireUuidParam(c, 'id');
      const [updated] = await db
        .update(activityPosts)
        .set({
          status: 'published',
          publishedAt: new Date(),
          moderatedBy: staff.userId,
          moderatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(activityPosts.id, postId), eq(activityPosts.status, 'pending')))
        .returning();

      if (!updated) throw new ApiError('NOT_FOUND', 'Pending post not found.', 404);
      const author = await loadAuthor(updated.authorUserId);
      return c.json({ post: presentPost(updated, author, true) });
    }, 'COMMUNITY_POST_APPROVE_FAILED', 'Unable to approve post.', 'approve community post'),
  );

  app.post(
    '/community/posts/:id/reject',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const postId = requireUuidParam(c, 'id');
      const [updated] = await db
        .update(activityPosts)
        .set({
          status: 'rejected',
          moderatedBy: staff.userId,
          moderatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(activityPosts.id, postId), eq(activityPosts.status, 'pending')))
        .returning();

      if (!updated) throw new ApiError('NOT_FOUND', 'Pending post not found.', 404);
      const author = await loadAuthor(updated.authorUserId);
      return c.json({ post: presentPost(updated, author, true) });
    }, 'COMMUNITY_POST_REJECT_FAILED', 'Unable to reject post.', 'reject community post'),
  );

  app.post(
    '/community/posts/:id/pin',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const body = z.object({ pinned: z.boolean() }).safeParse(await c.req.json().catch(() => ({})));
      if (!body.success) throw new ApiError('INVALID_REQUEST', body.error.message, 400);

      const [updated] = await db
        .update(activityPosts)
        .set({ isPinned: body.data.pinned, updatedAt: new Date() })
        .where(eq(activityPosts.id, requireUuidParam(c, 'id')))
        .returning();

      if (!updated) throw new ApiError('NOT_FOUND', 'Post not found.', 404);
      const author = await loadAuthor(updated.authorUserId);
      return c.json({ post: presentPost(updated, author, true) });
    }, 'COMMUNITY_POST_PIN_FAILED', 'Unable to pin post.', 'pin community post'),
  );

  app.delete(
    '/community/posts/:id',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const [deleted] = await db
        .delete(activityPosts)
        .where(eq(activityPosts.id, requireUuidParam(c, 'id')))
        .returning({ id: activityPosts.id });

      if (!deleted) throw new ApiError('NOT_FOUND', 'Post not found.', 404);
      return c.json({ success: true });
    }, 'COMMUNITY_POST_DELETE_FAILED', 'Unable to delete post.', 'delete community post'),
  );

  // --- Admin: channels -------------------------------------------------------

  app.get(
    '/community/admin/channels',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const rows = await db
        .select()
        .from(activityChannels)
        .orderBy(asc(activityChannels.sortOrder), asc(activityChannels.nameEn));

      const items = await Promise.all(
        rows.map(async (row) => {
          const entitlements = await loadChannelEntitlements(row.id);
          return presentAdminChannel(row, entitlements);
        }),
      );

      return c.json({ items });
    }, 'COMMUNITY_ADMIN_CHANNELS_FAILED', 'Unable to load admin channels.', 'admin list channels'),
  );

  app.post(
    '/community/admin/channels',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const body = createChannelSchema.safeParse(await c.req.json().catch(() => ({})));
      if (!body.success) throw new ApiError('INVALID_REQUEST', body.error.message, 400);

      const slug = body.data.slug ?? slugifyChannel(body.data.nameEn);
      if (!(await assertSlugAvailable(slug))) {
        throw new ApiError('SLUG_EXISTS', 'Slug already in use.', 409);
      }

      if (body.data.channelType === 'entitlement_gated' && !body.data.entitlements?.length) {
        throw new ApiError('INVALID_REQUEST', 'Entitlement-gated channels require at least one entitlement.', 400);
      }

      const [created] = await db
        .insert(activityChannels)
        .values({
          slug,
          nameEn: body.data.nameEn,
          nameAr: body.data.nameAr,
          descriptionEn: body.data.descriptionEn ?? null,
          descriptionAr: body.data.descriptionAr ?? null,
          channelType: body.data.channelType,
          coverImageUrl: sanitizeExternalUrl(body.data.coverImageUrl) ?? body.data.coverImageUrl,
          requiresApproval: body.data.requiresApproval ?? true,
          sortOrder: body.data.sortOrder ?? 0,
          createdBy: staff.userId,
        })
        .returning();

      if (body.data.entitlements?.length) {
        await replaceChannelEntitlements(created.id, body.data.entitlements);
      }

      const entitlements = await loadChannelEntitlements(created.id);
      return c.json({ channel: presentAdminChannel(created, entitlements) }, 201);
    }, 'COMMUNITY_ADMIN_CHANNEL_CREATE_FAILED', 'Unable to create channel.', 'admin create channel'),
  );

  app.put(
    '/community/admin/channels/:id',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const channelId = requireUuidParam(c, 'id');
      const body = updateChannelSchema.safeParse(await c.req.json().catch(() => ({})));
      if (!body.success) throw new ApiError('INVALID_REQUEST', body.error.message, 400);

      const [existing] = await db.select().from(activityChannels).where(eq(activityChannels.id, channelId)).limit(1);
      if (!existing) throw new ApiError('NOT_FOUND', 'Channel not found.', 404);

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (body.data.nameEn) patch.nameEn = body.data.nameEn;
      if (body.data.nameAr) patch.nameAr = body.data.nameAr;
      if (body.data.descriptionEn !== undefined) patch.descriptionEn = body.data.descriptionEn;
      if (body.data.descriptionAr !== undefined) patch.descriptionAr = body.data.descriptionAr;
      if (body.data.channelType) patch.channelType = body.data.channelType;
      if (body.data.coverImageUrl) patch.coverImageUrl = sanitizeExternalUrl(body.data.coverImageUrl);
      if (body.data.requiresApproval !== undefined) patch.requiresApproval = body.data.requiresApproval;
      if (body.data.sortOrder !== undefined) patch.sortOrder = body.data.sortOrder;
      if (body.data.slug && body.data.slug !== existing.slug) {
        if (!(await assertSlugAvailable(body.data.slug, channelId))) {
          throw new ApiError('SLUG_EXISTS', 'Slug already in use.', 409);
        }
        patch.slug = body.data.slug;
      }

      const [updated] = await db
        .update(activityChannels)
        .set(patch)
        .where(eq(activityChannels.id, channelId))
        .returning();

      if (body.data.entitlements) {
        await replaceChannelEntitlements(channelId, body.data.entitlements);
      }

      const entitlements = await loadChannelEntitlements(channelId);
      return c.json({ channel: presentAdminChannel(updated, entitlements) });
    }, 'COMMUNITY_ADMIN_CHANNEL_UPDATE_FAILED', 'Unable to update channel.', 'admin update channel'),
  );

  app.post(
    '/community/admin/channels/:id/archive',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const [updated] = await db
        .update(activityChannels)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(activityChannels.id, requireUuidParam(c, 'id')))
        .returning();

      if (!updated) throw new ApiError('NOT_FOUND', 'Channel not found.', 404);
      const entitlements = await loadChannelEntitlements(updated.id);
      return c.json({ channel: presentAdminChannel(updated, entitlements) });
    }, 'COMMUNITY_ADMIN_CHANNEL_ARCHIVE_FAILED', 'Unable to archive channel.', 'admin archive channel'),
  );

  app.post(
    '/community/admin/channels/:id/restore',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const [updated] = await db
        .update(activityChannels)
        .set({ archivedAt: null, updatedAt: new Date() })
        .where(eq(activityChannels.id, requireUuidParam(c, 'id')))
        .returning();

      if (!updated) throw new ApiError('NOT_FOUND', 'Channel not found.', 404);
      const entitlements = await loadChannelEntitlements(updated.id);
      return c.json({ channel: presentAdminChannel(updated, entitlements) });
    }, 'COMMUNITY_ADMIN_CHANNEL_RESTORE_FAILED', 'Unable to restore channel.', 'admin restore channel'),
  );

  app.delete(
    '/community/admin/channels/:id',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const channelId = requireUuidParam(c, 'id');
      const [deleted] = await db
        .delete(activityChannels)
        .where(eq(activityChannels.id, channelId))
        .returning({ id: activityChannels.id });

      if (!deleted) throw new ApiError('NOT_FOUND', 'Channel not found.', 404);
      return c.json({ success: true });
    }, 'COMMUNITY_ADMIN_CHANNEL_DELETE_FAILED', 'Unable to delete channel.', 'admin delete channel'),
  );

  app.get(
    '/community/admin/posts/pending',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const rows = await db
        .select()
        .from(activityPosts)
        .where(and(eq(activityPosts.status, 'pending'), isNull(activityPosts.archivedAt)))
        .orderBy(desc(activityPosts.createdAt));

      const authorIds = [...new Set(rows.map((row) => row.authorUserId))];
      const authors =
        authorIds.length > 0
          ? await db
              .select({ id: users.id, name: users.name, image: users.image })
              .from(users)
              .where(inArray(users.id, authorIds))
          : [];
      const authorMap = new Map(authors.map((a) => [a.id, a]));

      return c.json({
        items: rows.map((row) =>
          presentPost(row, authorMap.get(row.authorUserId) ?? { id: row.authorUserId, name: 'Member', image: null }, true),
        ),
      });
    }, 'COMMUNITY_ADMIN_PENDING_FAILED', 'Unable to load pending posts.', 'admin pending posts'),
  );

  // --- Admin: announcements --------------------------------------------------

  app.get(
    '/community/admin/announcements',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const rows = await db
        .select()
        .from(activityAnnouncements)
        .orderBy(desc(activityAnnouncements.createdAt));

      return c.json({ items: rows.map(presentAdminAnnouncement) });
    }, 'COMMUNITY_ADMIN_ANNOUNCEMENTS_FAILED', 'Unable to load announcements.', 'admin list announcements'),
  );

  app.post(
    '/community/admin/announcements',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const body = announcementBodySchema.safeParse(await c.req.json().catch(() => ({})));
      if (!body.success) throw new ApiError('INVALID_REQUEST', body.error.message, 400);

      const sanitized = mapSanitizedAnnouncementInput(body.data);
      const [created] = await db
        .insert(activityAnnouncements)
        .values({
          ...sanitized,
          status: 'draft',
          createdBy: staff.userId,
        })
        .returning();

      return c.json({ announcement: presentAdminAnnouncement(created) }, 201);
    }, 'COMMUNITY_ADMIN_ANNOUNCEMENT_CREATE_FAILED', 'Unable to create announcement.', 'admin create announcement'),
  );

  app.put(
    '/community/admin/announcements/:id',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const body = announcementBodySchema.partial().safeParse(await c.req.json().catch(() => ({})));
      if (!body.success) throw new ApiError('INVALID_REQUEST', body.error.message, 400);

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (body.data.channelId !== undefined) patch.channelId = body.data.channelId;
      if (body.data.titleEn) patch.titleEn = sanitizePlainText(body.data.titleEn, 180);
      if (body.data.titleAr) patch.titleAr = sanitizePlainText(body.data.titleAr, 180);
      if (body.data.bodyEn !== undefined) patch.bodyEn = sanitizeRichTextHtml(body.data.bodyEn) ?? '';
      if (body.data.bodyAr !== undefined) patch.bodyAr = sanitizeRichTextHtml(body.data.bodyAr) ?? '';

      const [updated] = await db
        .update(activityAnnouncements)
        .set(patch)
        .where(
          and(
            eq(activityAnnouncements.id, requireUuidParam(c, 'id')),
            inArray(activityAnnouncements.status, ['draft', 'scheduled']),
          ),
        )
        .returning();

      if (!updated) throw new ApiError('NOT_FOUND', 'Editable announcement not found.', 404);
      return c.json({ announcement: presentAdminAnnouncement(updated) });
    }, 'COMMUNITY_ADMIN_ANNOUNCEMENT_UPDATE_FAILED', 'Unable to update announcement.', 'admin update announcement'),
  );

  app.post(
    '/community/admin/announcements/:id/publish',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const now = new Date();
      const [updated] = await db
        .update(activityAnnouncements)
        .set({ status: 'published', publishedAt: now, updatedAt: now })
        .where(
          and(
            eq(activityAnnouncements.id, requireUuidParam(c, 'id')),
            inArray(activityAnnouncements.status, ['draft', 'scheduled']),
            isNull(activityAnnouncements.cancelledAt),
          ),
        )
        .returning();

      if (!updated) throw new ApiError('NOT_FOUND', 'Announcement not found or already published/cancelled.', 404);
      return c.json({ announcement: presentAdminAnnouncement(updated) });
    }, 'COMMUNITY_ADMIN_ANNOUNCEMENT_PUBLISH_FAILED', 'Unable to publish announcement.', 'admin publish announcement'),
  );

  app.post(
    '/community/admin/announcements/:id/schedule',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const body = z
        .object({ scheduledAt: z.string().datetime() })
        .safeParse(await c.req.json().catch(() => ({})));
      if (!body.success) throw new ApiError('INVALID_REQUEST', body.error.message, 400);

      const scheduledAt = new Date(body.data.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
        throw new ApiError('INVALID_REQUEST', 'Scheduled time must be in the future.', 400);
      }

      const [updated] = await db
        .update(activityAnnouncements)
        .set({
          status: 'scheduled',
          scheduledAt,
          cancelledAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(activityAnnouncements.id, requireUuidParam(c, 'id')),
            inArray(activityAnnouncements.status, ['draft', 'scheduled']),
            isNull(activityAnnouncements.cancelledAt),
          ),
        )
        .returning();

      if (!updated) throw new ApiError('NOT_FOUND', 'Announcement not found or not schedulable.', 404);
      return c.json({ announcement: presentAdminAnnouncement(updated) });
    }, 'COMMUNITY_ADMIN_ANNOUNCEMENT_SCHEDULE_FAILED', 'Unable to schedule announcement.', 'admin schedule announcement'),
  );

  app.post(
    '/community/admin/announcements/:id/cancel',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const [existing] = await db
        .select()
        .from(activityAnnouncements)
        .where(eq(activityAnnouncements.id, requireUuidParam(c, 'id')))
        .limit(1);

      if (!existing) throw new ApiError('NOT_FOUND', 'Announcement not found.', 404);
      if (existing.status === 'published') {
        throw new ApiError('INVALID_STATE', 'Published announcements cannot be cancelled.', 409);
      }
      if (existing.status !== 'scheduled') {
        throw new ApiError('INVALID_STATE', 'Only scheduled announcements can be cancelled.', 409);
      }

      const [updated] = await db
        .update(activityAnnouncements)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(activityAnnouncements.id, existing.id),
            eq(activityAnnouncements.status, 'scheduled'),
          ),
        )
        .returning();

      if (!updated) throw new ApiError('CONFLICT', 'Announcement was already processed.', 409);
      return c.json({ announcement: presentAdminAnnouncement(updated) });
    }, 'COMMUNITY_ADMIN_ANNOUNCEMENT_CANCEL_FAILED', 'Unable to cancel announcement.', 'admin cancel announcement'),
  );

  app.post(
    '/community/admin/announcements/:id/archive',
    handleRoute(async (c) => {
      const staff = await requireManager(c);
      if ('response' in staff) return staff.response;

      const [updated] = await db
        .update(activityAnnouncements)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(activityAnnouncements.id, requireUuidParam(c, 'id')))
        .returning();

      if (!updated) throw new ApiError('NOT_FOUND', 'Announcement not found.', 404);
      return c.json({ announcement: presentAdminAnnouncement(updated) });
    }, 'COMMUNITY_ADMIN_ANNOUNCEMENT_ARCHIVE_FAILED', 'Unable to archive announcement.', 'admin archive announcement'),
  );
}
