import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { notificationDeliveries } from '../../db/schema/index.js';
import { classifyEmail, classifyPhone } from './contact.js';
import { loadRecipientContacts } from './recipients.js';
import type { CampaignSummary, NotificationChannel } from './types.js';

export function buildIdempotencyKey(
  eventType: string,
  entityType: string | null | undefined,
  entityId: string | null | undefined,
  userId: string,
  channel: NotificationChannel,
): string {
  return `${eventType}:${entityType ?? ''}:${entityId ?? ''}:${userId}:${channel}`;
}

export type CreateDeliveriesParams = {
  campaignId: string;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  userIds: string[];
  channels?: NotificationChannel[];
  payload?: Record<string, unknown>;
  locale?: string;
};

/**
 * Insert email + WhatsApp deliveries for recipients.
 * Invalid contacts → status skipped immediately.
 * Valid WhatsApp → pending (worker marks provider_not_configured).
 * ON CONFLICT idempotency_key DO NOTHING.
 */
export async function createDeliveriesForRecipients(
  params: CreateDeliveriesParams,
): Promise<string[]> {
  const channels = params.channels ?? (['email', 'whatsapp'] as NotificationChannel[]);
  const contacts = await loadRecipientContacts(params.userIds);
  if (contacts.length === 0) return [];

  const now = new Date();
  const rows: Array<typeof notificationDeliveries.$inferInsert> = [];

  for (const contact of contacts) {
    for (const channel of channels) {
      const idempotencyKey = buildIdempotencyKey(
        params.eventType,
        params.entityType,
        params.entityId,
        contact.userId,
        channel,
      );

      if (channel === 'email') {
        const classified = classifyEmail(contact.email);
        if (classified.status === 'skip') {
          rows.push({
            campaignId: params.campaignId,
            eventType: params.eventType,
            entityType: params.entityType ?? null,
            entityId: params.entityId ?? null,
            recipientUserId: contact.userId,
            channel,
            status: 'skipped',
            skipReason: classified.reason,
            idempotencyKey,
            destinationMasked: classified.masked,
            payload: params.payload ?? {},
            locale: params.locale ?? 'en',
            skippedAt: now,
          });
        } else {
          rows.push({
            campaignId: params.campaignId,
            eventType: params.eventType,
            entityType: params.entityType ?? null,
            entityId: params.entityId ?? null,
            recipientUserId: contact.userId,
            channel,
            status: 'pending',
            idempotencyKey,
            destinationMasked: classified.masked,
            payload: params.payload ?? {},
            locale: params.locale ?? 'en',
          });
        }
        continue;
      }

      // whatsapp
      const classified = classifyPhone(contact.phoneNumber);
      if (classified.status === 'skip') {
        rows.push({
          campaignId: params.campaignId,
          eventType: params.eventType,
          entityType: params.entityType ?? null,
          entityId: params.entityId ?? null,
          recipientUserId: contact.userId,
          channel,
          status: 'skipped',
          skipReason: classified.reason,
          idempotencyKey,
          destinationMasked: classified.masked,
          payload: params.payload ?? {},
          locale: params.locale ?? 'en',
          skippedAt: now,
        });
      } else {
        rows.push({
          campaignId: params.campaignId,
          eventType: params.eventType,
          entityType: params.entityType ?? null,
          entityId: params.entityId ?? null,
          recipientUserId: contact.userId,
          channel,
          status: 'pending',
          idempotencyKey,
          destinationMasked: classified.masked,
          payload: params.payload ?? {},
          locale: params.locale ?? 'en',
        });
      }
    }
  }

  if (rows.length === 0) return [];

  // Batch insert; conflicts on idempotency_key are ignored.
  const inserted = await db
    .insert(notificationDeliveries)
    .values(rows)
    .onConflictDoNothing({ target: notificationDeliveries.idempotencyKey })
    .returning({ id: notificationDeliveries.id });

  return inserted.map((r) => r.id);
}

export async function computeCampaignSummary(campaignId: string): Promise<CampaignSummary> {
  const rows = await db
    .select({
      status: notificationDeliveries.status,
      count: sql<number>`count(*)::int`,
    })
    .from(notificationDeliveries)
    .where(eq(notificationDeliveries.campaignId, campaignId))
    .groupBy(notificationDeliveries.status);

  const summary: CampaignSummary = {
    total: 0,
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  for (const row of rows) {
    const n = Number(row.count) || 0;
    summary.total += n;
    if (row.status === 'pending') summary.pending = n;
    else if (row.status === 'processing') summary.processing = n;
    else if (row.status === 'sent') summary.sent = n;
    else if (row.status === 'failed') summary.failed = n;
    else if (row.status === 'skipped') summary.skipped = n;
  }

  return summary;
}

export async function campaignHasOpenDeliveries(campaignId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: notificationDeliveries.id })
    .from(notificationDeliveries)
    .where(
      and(
        eq(notificationDeliveries.campaignId, campaignId),
        inArray(notificationDeliveries.status, ['pending', 'processing']),
      ),
    )
    .limit(1);
  return Boolean(row);
}
