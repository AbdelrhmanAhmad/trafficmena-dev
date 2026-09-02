import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import type { Context } from 'hono';
import type { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { db } from '../../db/client.js';
import {
  notificationCampaigns,
  notificationDeliveries,
  notificationTemplates,
} from '../../db/schema/index.js';
import {
  CampaignError,
  cancelCampaign,
  createAnnouncementCampaign,
  previewCampaignAudience,
  scheduleCampaign,
  sendCampaignNow,
} from '../../services/notifications/campaigns.js';
import { previewAudience } from '../../services/notifications/recipients.js';
import type { AudienceSpec } from '../../services/notifications/types.js';
import { retryDelivery } from '../../services/notifications/worker.js';
import { sanitizeRichTextHtml } from '../../utils/expertContent.js';
import { requireManager } from './utils.js';

const uuidParam = z.string().uuid();

const audienceSpecSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('all_users') }),
  z.object({ type: z.literal('event_attendees'), eventId: z.string().uuid() }),
  z.object({ type: z.literal('track_buyers'), trackId: z.string().uuid() }),
  z.object({
    type: z.literal('masterclass_enrollees'),
    masterclassId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('activity_channel_members'),
    channelId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('role_based'),
    roles: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal('explicit_users'),
    userIds: z.array(z.string().uuid()).min(1),
  }),
]);

const templateCreateSchema = z.object({
  key: z.string().min(1).max(120),
  category: z.string().min(1).max(120),
  channel: z.enum(['email', 'whatsapp']),
  isActive: z.boolean().optional(),
  subjectEn: z.string().optional(),
  subjectAr: z.string().optional(),
  bodyHtmlEn: z.string().optional(),
  bodyHtmlAr: z.string().optional(),
  bodyTextEn: z.string().optional(),
  bodyTextAr: z.string().optional(),
  whatsappProviderTemplateId: z.string().nullable().optional(),
  allowedVariables: z.array(z.string()).optional(),
});

const templateUpdateSchema = templateCreateSchema.partial().omit({ key: true, channel: true });

const campaignCreateSchema = z.object({
  titleEn: z.string().min(1),
  titleAr: z.string().min(1),
  bodyHtmlEn: z.string().min(1),
  bodyHtmlAr: z.string().min(1),
  bodyTextEn: z.string().optional(),
  bodyTextAr: z.string().optional(),
  audience: audienceSpecSchema,
  activityAnnouncementId: z.string().uuid().nullable().optional(),
  templateId: z.string().uuid().nullable().optional(),
});

const scheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
});

function campaignErrorResponse(c: Context, error: CampaignError) {
  return c.json(
    { error: { code: error.code, message: error.message } },
    error.statusCode as ContentfulStatusCode,
  );
}

function mapTemplateRow(row: typeof notificationTemplates.$inferSelect) {
  return {
    id: row.id,
    key: row.key,
    category: row.category,
    channel: row.channel,
    isActive: row.isActive,
    subjectEn: row.subjectEn,
    subjectAr: row.subjectAr,
    bodyHtmlEn: row.bodyHtmlEn,
    bodyHtmlAr: row.bodyHtmlAr,
    bodyTextEn: row.bodyTextEn,
    bodyTextAr: row.bodyTextAr,
    whatsappProviderTemplateId: row.whatsappProviderTemplateId,
    allowedVariables: row.allowedVariables,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCampaignRow(row: typeof notificationCampaigns.$inferSelect) {
  return {
    id: row.id,
    kind: row.kind,
    eventType: row.eventType,
    entityType: row.entityType,
    entityId: row.entityId,
    activityAnnouncementId: row.activityAnnouncementId,
    templateId: row.templateId,
    audienceType: row.audienceType,
    audienceRef: row.audienceRef,
    status: row.status,
    scheduledAt: row.scheduledAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    bodyHtmlEn: row.bodyHtmlEn,
    bodyHtmlAr: row.bodyHtmlAr,
    bodyTextEn: row.bodyTextEn,
    bodyTextAr: row.bodyTextAr,
    summary: row.summary,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapDeliveryRow(row: typeof notificationDeliveries.$inferSelect) {
  return {
    id: row.id,
    campaignId: row.campaignId,
    eventType: row.eventType,
    entityType: row.entityType,
    entityId: row.entityId,
    recipientUserId: row.recipientUserId,
    channel: row.channel,
    status: row.status,
    skipReason: row.skipReason,
    destinationMasked: row.destinationMasked,
    provider: row.provider,
    providerMessageId: row.providerMessageId,
    attemptCount: row.attemptCount,
    lastErrorCode: row.lastErrorCode,
    lastErrorMessage: row.lastErrorMessage,
    locale: row.locale,
    claimedAt: row.claimedAt,
    sentAt: row.sentAt,
    failedAt: row.failedAt,
    skippedAt: row.skippedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function registerNotificationRoutes(app: Hono) {
  // --- Templates -----------------------------------------------------------

  app.get('/notifications/templates', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const rows = await db
      .select()
      .from(notificationTemplates)
      .orderBy(desc(notificationTemplates.updatedAt));

    return c.json({ items: rows.map(mapTemplateRow) });
  });

  app.post('/notifications/templates', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = templateCreateSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid template payload.' } },
        400,
      );
    }

    const data = body.data;
    try {
      const [row] = await db
        .insert(notificationTemplates)
        .values({
          key: data.key.trim(),
          category: data.category.trim(),
          channel: data.channel,
          isActive: data.isActive ?? true,
          subjectEn: data.subjectEn ?? '',
          subjectAr: data.subjectAr ?? '',
          bodyHtmlEn: sanitizeRichTextHtml(data.bodyHtmlEn) ?? '',
          bodyHtmlAr: sanitizeRichTextHtml(data.bodyHtmlAr) ?? '',
          bodyTextEn: data.bodyTextEn ?? '',
          bodyTextAr: data.bodyTextAr ?? '',
          whatsappProviderTemplateId: data.whatsappProviderTemplateId ?? null,
          allowedVariables: data.allowedVariables ?? [],
        })
        .returning();
      return c.json({ data: mapTemplateRow(row) }, 201);
    } catch (error) {
      console.error('[api] create notification template', error);
      return c.json(
        { error: { code: 'CREATE_FAILED', message: 'Failed to create template.' } },
        500,
      );
    }
  });

  app.get('/notifications/templates/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = uuidParam.safeParse(c.req.param('id'));
    if (!id.success) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Invalid template id.' } }, 400);
    }

    const [row] = await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.id, id.data))
      .limit(1);

    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Template not found.' } }, 404);
    }
    return c.json({ data: mapTemplateRow(row) });
  });

  app.put('/notifications/templates/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = uuidParam.safeParse(c.req.param('id'));
    if (!id.success) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Invalid template id.' } }, 400);
    }

    const body = templateUpdateSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid template payload.' } },
        400,
      );
    }

    const data = body.data;
    const patch: Partial<typeof notificationTemplates.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.category !== undefined) patch.category = data.category.trim();
    if (data.isActive !== undefined) patch.isActive = data.isActive;
    if (data.subjectEn !== undefined) patch.subjectEn = data.subjectEn;
    if (data.subjectAr !== undefined) patch.subjectAr = data.subjectAr;
    if (data.bodyHtmlEn !== undefined) patch.bodyHtmlEn = sanitizeRichTextHtml(data.bodyHtmlEn) ?? '';
    if (data.bodyHtmlAr !== undefined) patch.bodyHtmlAr = sanitizeRichTextHtml(data.bodyHtmlAr) ?? '';
    if (data.bodyTextEn !== undefined) patch.bodyTextEn = data.bodyTextEn;
    if (data.bodyTextAr !== undefined) patch.bodyTextAr = data.bodyTextAr;
    if (data.whatsappProviderTemplateId !== undefined) {
      patch.whatsappProviderTemplateId = data.whatsappProviderTemplateId;
    }
    if (data.allowedVariables !== undefined) patch.allowedVariables = data.allowedVariables;

    const [row] = await db
      .update(notificationTemplates)
      .set(patch)
      .where(eq(notificationTemplates.id, id.data))
      .returning();

    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Template not found.' } }, 404);
    }
    return c.json({ data: mapTemplateRow(row) });
  });

  app.post('/notifications/templates/:id/activate', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = uuidParam.safeParse(c.req.param('id'));
    if (!id.success) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Invalid template id.' } }, 400);
    }

    const [row] = await db
      .update(notificationTemplates)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(notificationTemplates.id, id.data))
      .returning();

    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Template not found.' } }, 404);
    }
    return c.json({ data: mapTemplateRow(row) });
  });

  app.post('/notifications/templates/:id/deactivate', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = uuidParam.safeParse(c.req.param('id'));
    if (!id.success) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Invalid template id.' } }, 400);
    }

    const [row] = await db
      .update(notificationTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(notificationTemplates.id, id.data))
      .returning();

    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Template not found.' } }, 404);
    }
    return c.json({ data: mapTemplateRow(row) });
  });

  // --- Campaigns -----------------------------------------------------------

  app.get('/notifications/campaigns', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const kind = c.req.query('kind');
    const conditions = [];
    if (kind === 'announcement' || kind === 'system') {
      conditions.push(eq(notificationCampaigns.kind, kind));
    }

    const rows = await db
      .select()
      .from(notificationCampaigns)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(notificationCampaigns.createdAt));

    return c.json({ items: rows.map(mapCampaignRow) });
  });

  app.post('/notifications/campaigns', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = campaignCreateSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid campaign payload.' } },
        400,
      );
    }

    try {
      const campaign = await createAnnouncementCampaign({
        ...body.data,
        audience: body.data.audience as AudienceSpec,
        createdBy: staff.userId,
      });
      return c.json({ data: mapCampaignRow(campaign) }, 201);
    } catch (error) {
      if (error instanceof CampaignError) return campaignErrorResponse(c, error);
      console.error('[api] create notification campaign', error);
      return c.json(
        { error: { code: 'CREATE_FAILED', message: 'Failed to create campaign.' } },
        500,
      );
    }
  });

  app.get('/notifications/campaigns/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = uuidParam.safeParse(c.req.param('id'));
    if (!id.success) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Invalid campaign id.' } }, 400);
    }

    const [row] = await db
      .select()
      .from(notificationCampaigns)
      .where(eq(notificationCampaigns.id, id.data))
      .limit(1);

    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Campaign not found.' } }, 404);
    }
    return c.json({ data: mapCampaignRow(row) });
  });

  app.post('/notifications/campaigns/:id/preview', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = uuidParam.safeParse(c.req.param('id'));
    if (!id.success) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Invalid campaign id.' } }, 400);
    }

    try {
      const preview = await previewCampaignAudience(id.data);
      return c.json({ data: preview });
    } catch (error) {
      if (error instanceof CampaignError) return campaignErrorResponse(c, error);
      console.error('[api] preview campaign audience', error);
      return c.json(
        { error: { code: 'PREVIEW_FAILED', message: 'Failed to preview audience.' } },
        500,
      );
    }
  });

  app.post('/notifications/campaigns/:id/send', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = uuidParam.safeParse(c.req.param('id'));
    if (!id.success) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Invalid campaign id.' } }, 400);
    }

    try {
      const result = await sendCampaignNow(id.data);
      return c.json({ data: result });
    } catch (error) {
      if (error instanceof CampaignError) return campaignErrorResponse(c, error);
      console.error('[api] send notification campaign', error);
      return c.json(
        { error: { code: 'SEND_FAILED', message: 'Failed to send campaign.' } },
        500,
      );
    }
  });

  app.post('/notifications/campaigns/:id/schedule', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = uuidParam.safeParse(c.req.param('id'));
    if (!id.success) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Invalid campaign id.' } }, 400);
    }

    const body = scheduleSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json(
        { error: { code: 'INVALID_INPUT', message: 'scheduledAt must be an ISO datetime.' } },
        400,
      );
    }

    try {
      const updated = await scheduleCampaign(id.data, new Date(body.data.scheduledAt));
      return c.json({ data: mapCampaignRow(updated) });
    } catch (error) {
      if (error instanceof CampaignError) return campaignErrorResponse(c, error);
      console.error('[api] schedule notification campaign', error);
      return c.json(
        { error: { code: 'SCHEDULE_FAILED', message: 'Failed to schedule campaign.' } },
        500,
      );
    }
  });

  app.post('/notifications/campaigns/:id/cancel', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = uuidParam.safeParse(c.req.param('id'));
    if (!id.success) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Invalid campaign id.' } }, 400);
    }

    try {
      const updated = await cancelCampaign(id.data);
      return c.json({ data: mapCampaignRow(updated) });
    } catch (error) {
      if (error instanceof CampaignError) return campaignErrorResponse(c, error);
      console.error('[api] cancel notification campaign', error);
      return c.json(
        { error: { code: 'CANCEL_FAILED', message: 'Failed to cancel campaign.' } },
        500,
      );
    }
  });

  // --- Audience preview (no campaign) --------------------------------------

  app.post('/notifications/audiences/preview', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const body = audienceSpecSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid audience specification.' } },
        400,
      );
    }

    try {
      const preview = await previewAudience(body.data as AudienceSpec);
      return c.json({ data: preview });
    } catch (error) {
      console.error('[api] preview audience', error);
      return c.json(
        { error: { code: 'PREVIEW_FAILED', message: 'Failed to preview audience.' } },
        500,
      );
    }
  });

  // --- Deliveries ----------------------------------------------------------

  app.get('/notifications/deliveries', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const status = c.req.query('status');
    const channel = c.req.query('channel');
    const eventType = c.req.query('eventType') ?? c.req.query('category');
    const campaignId = c.req.query('campaignId');
    const from = c.req.query('from');
    const to = c.req.query('to');
    const limitRaw = Number(c.req.query('limit') ?? 50);
    const offsetRaw = Number(c.req.query('offset') ?? 0);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    const conditions = [];
    if (status) conditions.push(eq(notificationDeliveries.status, status as any));
    if (channel === 'email' || channel === 'whatsapp') {
      conditions.push(eq(notificationDeliveries.channel, channel));
    }
    if (eventType) conditions.push(eq(notificationDeliveries.eventType, eventType));
    if (campaignId && uuidParam.safeParse(campaignId).success) {
      conditions.push(eq(notificationDeliveries.campaignId, campaignId));
    }
    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) {
        conditions.push(gte(notificationDeliveries.createdAt, fromDate));
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) {
        conditions.push(lte(notificationDeliveries.createdAt, toDate));
      }
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationDeliveries)
      .where(where);

    const rows = await db
      .select()
      .from(notificationDeliveries)
      .where(where)
      .orderBy(desc(notificationDeliveries.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      items: rows.map(mapDeliveryRow),
      total: Number(countRow?.count ?? 0),
      limit,
      offset,
    });
  });

  app.get('/notifications/deliveries/:id', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = uuidParam.safeParse(c.req.param('id'));
    if (!id.success) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Invalid delivery id.' } }, 400);
    }

    const [row] = await db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.id, id.data))
      .limit(1);

    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Delivery not found.' } }, 404);
    }
    return c.json({ data: mapDeliveryRow(row) });
  });

  app.post('/notifications/deliveries/:id/retry', async (c) => {
    const staff = await requireManager(c);
    if ('response' in staff) return staff.response;

    const id = uuidParam.safeParse(c.req.param('id'));
    if (!id.success) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Invalid delivery id.' } }, 400);
    }

    try {
      const result = await retryDelivery(id.data);
      return c.json({ data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Retry failed';
      if (message === 'Delivery not found') {
        return c.json({ error: { code: 'NOT_FOUND', message } }, 404);
      }
      if (message.includes('not retryable')) {
        return c.json({ error: { code: 'NOT_RETRYABLE', message } }, 400);
      }
      console.error('[api] retry notification delivery', error);
      return c.json({ error: { code: 'RETRY_FAILED', message: 'Failed to retry delivery.' } }, 500);
    }
  });
}
