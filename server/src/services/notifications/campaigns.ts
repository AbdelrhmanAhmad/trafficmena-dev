import { and, eq, lte } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { notificationCampaigns } from '../../db/schema/index.js';
import { sanitizeRichTextHtml } from '../../utils/expertContent.js';
import { notificationCampaignRateLimiter } from '../rateLimiter.js';
import { createDeliveriesForRecipients } from './deliveries.js';
import {
  audienceRefToSpec,
  audienceSpecToRef,
  previewAudience,
  resolveAudience,
} from './recipients.js';
import type {
  AudiencePreview,
  CreateAnnouncementCampaignInput,
} from './types.js';

const CAMPAIGN_RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };

export class CampaignError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'CampaignError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/** 10 announcement sends / hour per staff user id. */
export function checkCampaignRateLimit(userId: string) {
  return notificationCampaignRateLimiter.consume(`campaign:${userId}`, CAMPAIGN_RATE_LIMIT);
}

export async function createAnnouncementCampaign(input: CreateAnnouncementCampaignInput) {
  const { audienceType, audienceRef } = audienceSpecToRef(input.audience);

  const [campaign] = await db
    .insert(notificationCampaigns)
    .values({
      kind: 'announcement',
      eventType: 'announcement',
      entityType: 'campaign',
      activityAnnouncementId: input.activityAnnouncementId ?? null,
      templateId: input.templateId ?? null,
      audienceType,
      audienceRef,
      status: 'draft',
      titleEn: input.titleEn,
      titleAr: input.titleAr,
      bodyHtmlEn: sanitizeRichTextHtml(input.bodyHtmlEn) ?? '',
      bodyHtmlAr: sanitizeRichTextHtml(input.bodyHtmlAr) ?? '',
      bodyTextEn: input.bodyTextEn ?? '',
      bodyTextAr: input.bodyTextAr ?? '',
      createdBy: input.createdBy,
      summary: {},
    })
    .returning();

  // entity_id = campaign id for idempotency scoping
  await db
    .update(notificationCampaigns)
    .set({ entityId: campaign.id, updatedAt: new Date() })
    .where(eq(notificationCampaigns.id, campaign.id));

  return { ...campaign, entityId: campaign.id };
}

export async function previewCampaignAudience(campaignId: string): Promise<AudiencePreview> {
  const [campaign] = await db
    .select()
    .from(notificationCampaigns)
    .where(eq(notificationCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    throw new CampaignError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404);
  }

  const spec = audienceRefToSpec(campaign.audienceType, campaign.audienceRef);
  if (!spec) {
    throw new CampaignError('INVALID_AUDIENCE', 'Campaign has invalid audience configuration');
  }

  return previewAudience(spec);
}

async function activateCampaign(campaignId: string, opts?: { skipRateLimit?: boolean }) {
  const [campaign] = await db
    .select()
    .from(notificationCampaigns)
    .where(eq(notificationCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    throw new CampaignError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404);
  }

  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new CampaignError(
      'INVALID_STATUS',
      `Cannot activate campaign in status ${campaign.status}`,
    );
  }

  if (!opts?.skipRateLimit && campaign.createdBy) {
    const rate = checkCampaignRateLimit(campaign.createdBy);
    if (!rate.allowed) {
      throw new CampaignError(
        'RATE_LIMITED',
        'Too many campaigns sent. Please try again later.',
        429,
      );
    }
  }

  const spec = audienceRefToSpec(campaign.audienceType, campaign.audienceRef);
  if (!spec) {
    throw new CampaignError('INVALID_AUDIENCE', 'Campaign has invalid audience configuration');
  }

  const userIds = await resolveAudience(spec);
  const now = new Date();

  await db
    .update(notificationCampaigns)
    .set({
      status: 'processing',
      startedAt: now,
      updatedAt: now,
      entityType: campaign.entityType ?? 'campaign',
      entityId: campaign.entityId ?? campaign.id,
    })
    .where(eq(notificationCampaigns.id, campaignId));

  const deliveryIds = await createDeliveriesForRecipients({
    campaignId,
    eventType: campaign.eventType,
    entityType: campaign.entityType ?? 'campaign',
    entityId: campaign.entityId ?? campaign.id,
    userIds,
    payload: {},
    locale: 'en',
  });

  if (deliveryIds.length === 0 && userIds.length === 0) {
    await db
      .update(notificationCampaigns)
      .set({
        status: 'completed',
        completedAt: now,
        summary: { total: 0, pending: 0, processing: 0, sent: 0, failed: 0, skipped: 0 },
        updatedAt: now,
      })
      .where(eq(notificationCampaigns.id, campaignId));
  }

  return { campaignId, deliveryIds };
}

/** Resolve audience, create pending/skipped deliveries, set processing — does not await sends. */
export async function sendCampaignNow(campaignId: string) {
  return activateCampaign(campaignId, { skipRateLimit: false });
}

export async function scheduleCampaign(campaignId: string, scheduledAt: Date) {
  if (!(scheduledAt instanceof Date) || Number.isNaN(scheduledAt.getTime())) {
    throw new CampaignError('INVALID_SCHEDULE', 'scheduledAt must be a valid date');
  }
  if (scheduledAt.getTime() <= Date.now()) {
    throw new CampaignError('INVALID_SCHEDULE', 'scheduledAt must be in the future');
  }

  const [campaign] = await db
    .select()
    .from(notificationCampaigns)
    .where(eq(notificationCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    throw new CampaignError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404);
  }
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new CampaignError(
      'INVALID_STATUS',
      `Cannot schedule campaign in status ${campaign.status}`,
    );
  }

  const [updated] = await db
    .update(notificationCampaigns)
    .set({
      status: 'scheduled',
      scheduledAt,
      updatedAt: new Date(),
    })
    .where(eq(notificationCampaigns.id, campaignId))
    .returning();

  return updated;
}

export async function cancelCampaign(campaignId: string) {
  const [campaign] = await db
    .select()
    .from(notificationCampaigns)
    .where(eq(notificationCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    throw new CampaignError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404);
  }
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new CampaignError(
      'INVALID_STATUS',
      `Cannot cancel campaign in status ${campaign.status}`,
    );
  }

  const now = new Date();
  const [updated] = await db
    .update(notificationCampaigns)
    .set({
      status: 'cancelled',
      cancelledAt: now,
      updatedAt: now,
    })
    .where(eq(notificationCampaigns.id, campaignId))
    .returning();

  return updated;
}

/** Activate scheduled campaigns whose scheduled_at <= now (like sendNow, no staff rate limit). */
export async function activateDueNotificationCampaigns(): Promise<number> {
  const now = new Date();
  const due = await db
    .select({ id: notificationCampaigns.id })
    .from(notificationCampaigns)
    .where(
      and(
        eq(notificationCampaigns.status, 'scheduled'),
        lte(notificationCampaigns.scheduledAt, now),
      ),
    );

  let activated = 0;
  for (const row of due) {
    try {
      await activateCampaign(row.id, { skipRateLimit: true });
      activated += 1;
    } catch (error) {
      console.error('[notifications] Failed to activate due campaign', {
        campaignId: row.id,
        error,
      });
    }
  }
  return activated;
}
