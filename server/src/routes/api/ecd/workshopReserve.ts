import { eq, sql } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import {
  ecdSessions,
  ecdWorkshopReservations,
  type ecdBookings,
} from '../../../db/schema/ecd.js';
import { workshopSeatStatus } from './helpers.js';

export type WorkshopReserveResult =
  | { ok: true; workshops: Awaited<ReturnType<typeof loadWorkshopRows>>; cleared?: boolean }
  | { ok: false; status: 400 | 409; code: string; message: string; slug?: string };

async function loadWorkshopRows(bookingId: string) {
  const { asc } = await import('drizzle-orm');
  const rows = await db
    .select({
      id: ecdWorkshopReservations.id,
      sessionId: ecdWorkshopReservations.sessionId,
      timeLabel: ecdWorkshopReservations.timeLabel,
      sessionCheckedInAt: ecdWorkshopReservations.sessionCheckedInAt,
      createdAt: ecdWorkshopReservations.createdAt,
      slug: ecdSessions.slug,
      title: ecdSessions.title,
      trackIndex: ecdSessions.trackIndex,
      format: ecdSessions.format,
    })
    .from(ecdWorkshopReservations)
    .innerJoin(ecdSessions, eq(ecdWorkshopReservations.sessionId, ecdSessions.id))
    .where(eq(ecdWorkshopReservations.bookingId, bookingId))
    .orderBy(asc(ecdWorkshopReservations.timeLabel));

  return rows.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    slug: r.slug,
    title: r.title,
    trackIndex: r.trackIndex,
    timeLabel: r.timeLabel,
    format: r.format,
    sessionCheckedInAt: r.sessionCheckedInAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Shared FJ workshop seat hold — used by HTML checkout token flow and SPA portal. */
export async function reserveWorkshopsForBooking(
  booking: typeof ecdBookings.$inferSelect,
  sessionSlugs: string[],
): Promise<WorkshopReserveResult> {
  if (booking.paymentStatus !== 'paid') {
    return {
      ok: false,
      status: 400,
      code: 'PAYMENT_REQUIRED',
      message: 'Workshops unlock after payment.',
    };
  }
  if (booking.ticketType !== 'fj') {
    return {
      ok: false,
      status: 400,
      code: 'FJ_REQUIRED',
      message: 'Workshop reservation is for Full Journey passes only.',
    };
  }

  const slugs = [...new Set(sessionSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (slugs.length === 0) {
    await db
      .delete(ecdWorkshopReservations)
      .where(eq(ecdWorkshopReservations.bookingId, booking.id));
    return { ok: true, workshops: [], cleared: true };
  }

  const allSessions = await db.select().from(ecdSessions).where(eq(ecdSessions.published, 1));
  const bySlug = new Map(allSessions.map((s) => [s.slug.toLowerCase(), s]));
  const picked: Array<(typeof allSessions)[number]> = [];
  for (const slug of slugs) {
    const session = bySlug.get(slug);
    if (!session || session.fullJourneyOnly !== 1) {
      return {
        ok: false,
        status: 400,
        code: 'INVALID_SESSION',
        message: `Unknown workshop: ${slug}`,
      };
    }
    picked.push(session);
  }

  const times = new Set(picked.map((s) => s.timeLabel));
  if (times.size !== picked.length) {
    return {
      ok: false,
      status: 400,
      code: 'SLOT_CONFLICT',
      message: 'Pick at most one workshop per time slot.',
    };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(ecdWorkshopReservations)
        .where(eq(ecdWorkshopReservations.bookingId, booking.id));

      for (const session of picked) {
        const [countRow] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(ecdWorkshopReservations)
          .where(eq(ecdWorkshopReservations.sessionId, session.id));
        const reserved = Number(countRow?.count ?? 0);
        const seats = workshopSeatStatus(session.capacity, reserved);
        if (!seats.available) {
          throw Object.assign(new Error('FULL'), {
            code: 'WORKSHOP_FULL',
            slug: session.slug,
            title: session.title,
          });
        }
        await tx.insert(ecdWorkshopReservations).values({
          bookingId: booking.id,
          sessionId: session.id,
          timeLabel: session.timeLabel,
        });
      }
    });

    const workshops = await loadWorkshopRows(booking.id);
    return { ok: true, workshops };
  } catch (err: any) {
    if (err?.code === 'WORKSHOP_FULL') {
      return {
        ok: false,
        status: 409,
        code: 'WORKSHOP_FULL',
        message: `${err.title || err.slug} is fully booked.`,
        slug: err.slug,
      };
    }
    throw err;
  }
}

export { loadWorkshopRows };
