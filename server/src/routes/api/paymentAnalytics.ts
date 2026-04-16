import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { events, payments, promoCodes, tracks } from '../../db/schema/index.js';
import {
  buildVerifiedPaymentAnalytics,
  getDefaultAnalyticsItemCategory,
  getDefaultAnalyticsItemName,
  type VerifiedPaymentAnalytics,
} from './paymentAnalyticsHelpers.js';

type PaymentRow = typeof payments.$inferSelect;

async function loadAnalyticsItemMetadata(
  payment: PaymentRow,
): Promise<{ itemName: string; itemCategory: string }> {
  if (payment.itemType === 'subscription') {
    return {
      itemName: getDefaultAnalyticsItemName(payment.itemType),
      itemCategory: getDefaultAnalyticsItemCategory(payment.itemType),
    };
  }

  if (!payment.itemId) {
    return {
      itemName: '',
      itemCategory: getDefaultAnalyticsItemCategory(payment.itemType),
    };
  }

  if (payment.itemType === 'event') {
    const [eventRecord] = await db
      .select({ title: events.title, eventType: events.eventType })
      .from(events)
      .where(eq(events.id, payment.itemId))
      .limit(1);

    return {
      itemName: eventRecord?.title ?? '',
      itemCategory: eventRecord?.eventType ?? getDefaultAnalyticsItemCategory(payment.itemType),
    };
  }

  const [trackRecord] = await db
    .select({ title: tracks.title })
    .from(tracks)
    .where(eq(tracks.id, payment.itemId))
    .limit(1);

  return {
    itemName: trackRecord?.title ?? '',
    itemCategory: getDefaultAnalyticsItemCategory(payment.itemType),
  };
}

export async function loadVerifiedPaymentAnalytics(
  payment: PaymentRow,
  paymentMethod?: string | null,
): Promise<VerifiedPaymentAnalytics> {
  const itemMetadataPromise = loadAnalyticsItemMetadata(payment);
  const promoCodePromise = payment.promoCodeId
    ? db
        .select({ code: promoCodes.code })
        .from(promoCodes)
        .where(eq(promoCodes.id, payment.promoCodeId))
        .limit(1)
    : Promise.resolve([]);

  const priorPaidPurchasesPromise = db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .where(
      and(
        eq(payments.userId, payment.userId),
        eq(payments.status, 'paid'),
        ne(payments.id, payment.id),
      ),
    )
    .limit(1);

  const priorNonSubscriptionPurchasesPromise = db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .where(
      and(
        eq(payments.userId, payment.userId),
        eq(payments.status, 'paid'),
        ne(payments.id, payment.id),
        sql`${payments.itemType} != 'subscription'`,
      ),
    )
    .limit(1);

  const [itemMetadata, promoCodeRows, priorPaidRows, priorNonSubscriptionRows] = await Promise.all([
    itemMetadataPromise,
    promoCodePromise,
    priorPaidPurchasesPromise,
    priorNonSubscriptionPurchasesPromise,
  ]);

  return buildVerifiedPaymentAnalytics({
    amountCents: payment.amountCents,
    itemType: payment.itemType,
    itemName: itemMetadata.itemName,
    itemCategory: itemMetadata.itemCategory,
    paymentMethod,
    promoCode: promoCodeRows[0]?.code ?? '',
    originalAmountCents: payment.originalAmountCents,
    discountAppliedCents: payment.discountAppliedCents,
    priorPaidPurchases: priorPaidRows[0]?.count ?? 0,
    priorNonSubscriptionPurchases: priorNonSubscriptionRows[0]?.count ?? 0,
  });
}
