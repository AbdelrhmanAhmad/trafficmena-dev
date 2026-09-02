import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  notificationCampaigns,
  notificationDeliveries,
  notificationTemplates,
  profiles,
  users,
} from '../../db/schema/index.js';
import { EmailDeliveryError } from '../email.js';
import {
  campaignHasOpenDeliveries,
  computeCampaignSummary,
} from './deliveries.js';
import { getEmailProvider } from './emailProvider.js';
import { renderFreeformContent, renderTemplate, TemplateRenderError } from './templateRender.js';
import { getWhatsAppProvider } from './whatsappProvider.js';

function resolveEmailAttachments(
  payloadAttachments: unknown,
  icsContent: unknown,
  icsFilename: unknown,
): Array<{ filename: string; content: string }> | undefined {
  if (Array.isArray(payloadAttachments)) {
    const files = payloadAttachments
      .filter(
        (file): file is { filename: string; content: string } =>
          Boolean(file) &&
          typeof file === 'object' &&
          typeof (file as { filename?: unknown }).filename === 'string' &&
          typeof (file as { content?: unknown }).content === 'string',
      )
      .map((file) => ({ filename: file.filename, content: file.content }));
    if (files.length > 0) return files;
  }

  if (typeof icsContent === 'string' && typeof icsFilename === 'string' && icsContent && icsFilename) {
    return [{ filename: icsFilename, content: icsContent }];
  }

  return undefined;
}

async function maybeCompleteCampaign(campaignId: string | null | undefined) {
  if (!campaignId) return;
  const open = await campaignHasOpenDeliveries(campaignId);
  if (open) {
    const summary = await computeCampaignSummary(campaignId);
    await db
      .update(notificationCampaigns)
      .set({ summary, updatedAt: new Date() })
      .where(eq(notificationCampaigns.id, campaignId));
    return;
  }

  const summary = await computeCampaignSummary(campaignId);
  await db
    .update(notificationCampaigns)
    .set({
      status: 'completed',
      completedAt: new Date(),
      summary,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(notificationCampaigns.id, campaignId),
        eq(notificationCampaigns.status, 'processing'),
      ),
    );
}

async function processOneDelivery(deliveryId: string): Promise<'sent' | 'failed' | 'skipped' | 'missed'> {
  const now = new Date();
  const [claimed] = await db
    .update(notificationDeliveries)
    .set({
      status: 'processing',
      claimedAt: now,
      attemptCount: sql`${notificationDeliveries.attemptCount} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(notificationDeliveries.id, deliveryId),
        eq(notificationDeliveries.status, 'pending'),
      ),
    )
    .returning();

  if (!claimed) return 'missed';

  const [recipient] = await db
    .select({
      email: users.email,
      name: users.name,
      phoneNumber: profiles.phoneNumber,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.id, users.id))
    .where(eq(users.id, claimed.recipientUserId))
    .limit(1);

  const campaign = claimed.campaignId
    ? (
        await db
          .select()
          .from(notificationCampaigns)
          .where(eq(notificationCampaigns.id, claimed.campaignId))
          .limit(1)
      )[0]
    : null;

  const payload = (claimed.payload ?? {}) as Record<string, unknown>;
  const locale = claimed.locale === 'ar' ? 'ar' : 'en';

  try {
    if (claimed.channel === 'whatsapp') {
      const phone = recipient?.phoneNumber;
      const result = await getWhatsAppProvider().send({
        toE164: phone ?? '',
        bodyText: '',
        locale,
      });

      if (result.status === 'skipped') {
        await db
          .update(notificationDeliveries)
          .set({
            status: 'skipped',
            skipReason: result.reason ?? 'provider_not_configured',
            provider: 'unconfigured',
            providerMessageId: result.providerMessageId ?? null,
            skippedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(notificationDeliveries.id, claimed.id));
        await maybeCompleteCampaign(claimed.campaignId);
        return 'skipped';
      }

      if (result.status === 'failed') {
        await db
          .update(notificationDeliveries)
          .set({
            status: 'failed',
            lastErrorCode: result.reason ?? 'whatsapp_failed',
            lastErrorMessage: result.reason ?? 'WhatsApp send failed',
            failedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(notificationDeliveries.id, claimed.id));
        await maybeCompleteCampaign(claimed.campaignId);
        return 'failed';
      }

      await db
        .update(notificationDeliveries)
        .set({
          status: 'sent',
          provider: 'whatsapp',
          providerMessageId: result.providerMessageId ?? null,
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(notificationDeliveries.id, claimed.id));
      await maybeCompleteCampaign(claimed.campaignId);
      return 'sent';
    }

    // email
    if (!recipient?.email) {
      await db
        .update(notificationDeliveries)
        .set({
          status: 'skipped',
          skipReason: 'missing_or_invalid_email',
          skippedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(notificationDeliveries.id, claimed.id));
      await maybeCompleteCampaign(claimed.campaignId);
      return 'skipped';
    }

    const {
      attachments: payloadAttachments,
      icsContent,
      icsFilename,
      ...payloadVars
    } = payload;

    const vars: Record<string, unknown> = {
      userName: recipient.name ?? 'Member',
      ...payloadVars,
    };

    let subject: string;
    let html: string;
    let text: string;

    const templateKey =
      typeof payload.templateKey === 'string' ? payload.templateKey : claimed.eventType;

    if (campaign?.kind === 'announcement' && !campaign.templateId) {
      const rendered = renderFreeformContent({
        subject: locale === 'ar' ? campaign.titleAr : campaign.titleEn,
        html: locale === 'ar' ? campaign.bodyHtmlAr : campaign.bodyHtmlEn,
        text: locale === 'ar' ? campaign.bodyTextAr : campaign.bodyTextEn,
        vars,
      });
      subject = rendered.subject;
      html = rendered.html;
      text = rendered.text;
    } else {
      let template = null as typeof notificationTemplates.$inferSelect | null;
      if (campaign?.templateId) {
        const [t] = await db
          .select()
          .from(notificationTemplates)
          .where(eq(notificationTemplates.id, campaign.templateId))
          .limit(1);
        template = t ?? null;
      }
      if (!template) {
        const [t] = await db
          .select()
          .from(notificationTemplates)
          .where(
            and(
              eq(notificationTemplates.key, templateKey),
              eq(notificationTemplates.channel, 'email'),
              eq(notificationTemplates.isActive, true),
            ),
          )
          .limit(1);
        template = t ?? null;
      }

      if (!template) {
        throw new TemplateRenderError(`Template not found: ${templateKey}`);
      }

      const rendered = renderTemplate(template, locale, vars);
      subject = rendered.subject;
      html = rendered.html;
      text = rendered.text;
    }

    const attachments = resolveEmailAttachments(payloadAttachments, icsContent, icsFilename);

    const sendResult = await getEmailProvider().send({
      to: recipient.email,
      subject,
      html,
      text,
      attachments,
    });

    await db
      .update(notificationDeliveries)
      .set({
        status: 'sent',
        provider: 'resend',
        providerMessageId: sendResult.providerMessageId,
        sentAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(notificationDeliveries.id, claimed.id));

    await maybeCompleteCampaign(claimed.campaignId);
    return 'sent';
  } catch (error) {
    let code = 'send_failed';
    let message = 'Delivery failed';
    if (error instanceof TemplateRenderError) {
      code = error.code;
      message = error.message;
    } else if (error instanceof EmailDeliveryError) {
      code = error.code;
      message = `Email delivery failed: ${error.code}`;
    } else if (error instanceof Error) {
      message = error.message.slice(0, 200);
    }

    await db
      .update(notificationDeliveries)
      .set({
        status: 'failed',
        lastErrorCode: code,
        lastErrorMessage: message,
        failedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(notificationDeliveries.id, claimed.id));

    await maybeCompleteCampaign(claimed.campaignId);
    return 'failed';
  }
}

export async function processPendingNotificationDeliveries(limit = 50): Promise<{
  claimed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const pending = await db
    .select({ id: notificationDeliveries.id })
    .from(notificationDeliveries)
    .where(eq(notificationDeliveries.status, 'pending'))
    .limit(limit);

  const stats = { claimed: 0, sent: 0, failed: 0, skipped: 0 };

  for (const row of pending) {
    const result = await processOneDelivery(row.id);
    if (result === 'missed') continue;
    stats.claimed += 1;
    if (result === 'sent') stats.sent += 1;
    else if (result === 'failed') stats.failed += 1;
    else if (result === 'skipped') stats.skipped += 1;
  }

  return stats;
}

/**
 * Pure retry gate: failed deliveries, or skipped because WhatsApp provider is not configured.
 * Contact-quality skips (missing/invalid email|phone) are not retryable.
 */
export function isDeliveryRetryable(
  status: string,
  skipReason?: string | null,
): boolean {
  if (status === 'failed') return true;
  if (status === 'skipped' && skipReason === 'provider_not_configured') return true;
  return false;
}

/**
 * Retry a failed delivery, or skipped with provider_not_configured.
 * Resets to pending so the worker can pick it up again.
 */
export async function retryDelivery(deliveryId: string): Promise<{ id: string; status: string }> {
  const [delivery] = await db
    .select()
    .from(notificationDeliveries)
    .where(eq(notificationDeliveries.id, deliveryId))
    .limit(1);

  if (!delivery) {
    throw new Error('Delivery not found');
  }

  if (!isDeliveryRetryable(delivery.status, delivery.skipReason)) {
    throw new Error(`Delivery status ${delivery.status} is not retryable`);
  }

  const [updated] = await db
    .update(notificationDeliveries)
    .set({
      status: 'pending',
      skipReason: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      claimedAt: null,
      failedAt: null,
      skippedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(notificationDeliveries.id, deliveryId))
    .returning({ id: notificationDeliveries.id, status: notificationDeliveries.status });

  if (delivery.campaignId) {
    await db
      .update(notificationCampaigns)
      .set({ status: 'processing', completedAt: null, updatedAt: new Date() })
      .where(eq(notificationCampaigns.id, delivery.campaignId));
  }

  return updated;
}
