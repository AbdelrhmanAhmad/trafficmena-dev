import { and, eq, inArray, lte } from 'drizzle-orm';
import { db } from '../db/client.js';
import { eventReservations, payments, trackReservations } from '../db/schema/index.js';

// 72 hours expiry (matching the constant in payments.ts)
const PENDING_PAYMENT_EXPIRY_MS = 72 * 60 * 60 * 1000;

// 1 hour interval for background job
const EXPIRATION_JOB_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Expires all stale pending payments that have been sitting for too long.
 * Run as a background job to prevent checkout latency.
 */
export async function expireAllStalePendingPayments(): Promise<number> {
  const expiryThreshold = new Date(Date.now() - PENDING_PAYMENT_EXPIRY_MS);

  const result = await db
    .update(payments)
    .set({ status: 'expired' })
    .where(and(eq(payments.status, 'pending'), lte(payments.createdAt, expiryThreshold)))
    .returning({ id: payments.id });

  if (result.length > 0) {
    const expiredPaymentIds = result.map((row) => row.id);
    await db
      .delete(eventReservations)
      .where(inArray(eventReservations.paymentId, expiredPaymentIds));
    await db
      .delete(trackReservations)
      .where(inArray(trackReservations.paymentId, expiredPaymentIds));
    console.log(`[payment-expiration] Expired ${result.length} stale pending payments`);
  }

  return result.length;
}

/**
 * Starts the payment expiration background job.
 * Runs immediately on startup, then every hour.
 */
export function startPaymentExpirationJob(): void {
  // Run immediately on startup to clean up any stale payments
  expireAllStalePendingPayments().catch((error) => {
    console.error('[payment-expiration] Initial cleanup failed:', error);
  });

  // Schedule hourly cleanup
  setInterval(async () => {
    try {
      await expireAllStalePendingPayments();
    } catch (error) {
      console.error('[payment-expiration] Failed to expire stale payments:', error);
    }
  }, EXPIRATION_JOB_INTERVAL_MS);

  console.log('[server] Payment expiration job scheduled (hourly)');
}
