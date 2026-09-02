import { and, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { notificationCampaigns, notificationTemplates } from '../../db/schema/index.js';
import { createDeliveriesForRecipients } from './deliveries.js';
import { resolveAudience } from './recipients.js';
import type { NotifyBusinessEventInput, NotifyBusinessEventResult } from './types.js';

/**
 * Enqueue a system notification for one or more recipients.
 * Creates a lightweight system campaign + email/whatsapp delivery rows (outbox).
 * Does not send synchronously — the worker processes pending deliveries.
 */
export async function notifyBusinessEvent(
  input: NotifyBusinessEventInput,
): Promise<NotifyBusinessEventResult> {
  let userIds = input.recipientUserIds ? [...new Set(input.recipientUserIds.filter(Boolean))] : [];

  if (userIds.length === 0 && input.audience) {
    userIds = await resolveAudience(input.audience);
  }

  const templateKey = input.templateKey ?? input.type;
  const [emailTemplate] = await db
    .select({ id: notificationTemplates.id })
    .from(notificationTemplates)
    .where(
      and(
        eq(notificationTemplates.key, templateKey),
        eq(notificationTemplates.channel, 'email'),
        eq(notificationTemplates.isActive, true),
      ),
    )
    .limit(1);

  const [campaign] = await db
    .insert(notificationCampaigns)
    .values({
      kind: 'system',
      eventType: input.type,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      templateId: emailTemplate?.id ?? null,
      status: 'processing',
      startedAt: new Date(),
      titleEn: input.type,
      titleAr: input.type,
      audienceRef: input.audience
        ? { ...(input.audience as unknown as Record<string, unknown>) }
        : { userIds },
      summary: {},
    })
    .returning({ id: notificationCampaigns.id });

  const campaignId = campaign.id;

  if (userIds.length === 0) {
    await db
      .update(notificationCampaigns)
      .set({
        status: 'completed',
        completedAt: new Date(),
        summary: { total: 0, pending: 0, processing: 0, sent: 0, failed: 0, skipped: 0 },
        updatedAt: new Date(),
      })
      .where(eq(notificationCampaigns.id, campaignId));
    return { campaignId, deliveryIds: [] };
  }

  const deliveryIds = await createDeliveriesForRecipients({
    campaignId,
    eventType: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    userIds,
    payload: {
      ...(input.payload ?? {}),
      templateKey,
    },
    locale: input.locale ?? 'en',
  });

  return { campaignId, deliveryIds };
}
