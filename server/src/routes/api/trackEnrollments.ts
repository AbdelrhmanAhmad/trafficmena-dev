import { eq } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { tracks, users } from '../../db/schema/index.js';
import { handleRoute } from '../../utils/errors.js';
import { extractJsonPayload, jsonPayloadErrorStatusCode } from './jsonPayload.js';
import { executeTrackBookingWrite, revokeTrackBookingAccess } from './trackBookingShared.js';
import { consumeRateLimit, requireManager } from './utils.js';

const TRACK_ENROLLMENT_MUTATION_RATE_LIMIT = { limit: 40, windowMs: 60_000 };

const uuidPathParamSchema = z.string().uuid();

const manualEnrollmentSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
  reference: z.string().trim().min(3).max(255),
  amountPaidCents: z
    .union([
      z.coerce
        .number()
        .int()
        .min(0, 'Amount cannot be negative.')
        .max(10_000_000, 'Amount too large.'),
      z.null(),
    ])
    .optional(),
});

const revokeEnrollmentSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

type RegisterTrackEnrollmentRoutesDeps = {
  requireManager: typeof requireManager;
  consumeRateLimit: typeof consumeRateLimit;
  extractJsonPayload: typeof extractJsonPayload;
  now: () => Date;
};

const defaultDeps: RegisterTrackEnrollmentRoutesDeps = {
  requireManager,
  consumeRateLimit,
  extractJsonPayload,
  now: () => new Date(),
};

export function registerTrackEnrollmentRoutes(
  app: Hono,
  deps: Partial<RegisterTrackEnrollmentRoutesDeps> = {},
) {
  const resolvedDeps = { ...defaultDeps, ...deps };

  app.post(
    '/tracks/:id/manual-enrollments',
    handleRoute(
      async (c) => {
        const actor = await resolvedDeps.requireManager(c);
        if ('response' in actor) return actor.response;

        const rateLimited = resolvedDeps.consumeRateLimit(
          c,
          `track-enrollment:create:${actor.userId}`,
          TRACK_ENROLLMENT_MUTATION_RATE_LIMIT,
        );
        if (rateLimited) return rateLimited;

        const trackIdParsed = uuidPathParamSchema.safeParse(c.req.param('id'));
        if (!trackIdParsed.success) {
          return c.json(
            { error: { code: 'INVALID_PARAM', message: 'Track ID must be a valid UUID.' } },
            400,
          );
        }

        const bodyResult = await resolvedDeps.extractJsonPayload(c);
        if (!bodyResult.ok) {
          return c.json(
            { error: { code: bodyResult.code, message: bodyResult.message } },
            jsonPayloadErrorStatusCode(bodyResult.code),
          );
        }

        const parsed = manualEnrollmentSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
          return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
        }

        const trackId = trackIdParsed.data;
        const now = resolvedDeps.now();

        const result = await db.transaction(async (tx) => {
          const [[track], [user]] = await Promise.all([
            tx
              .select({
                id: tracks.id,
                title: tracks.title,
                isPublished: tracks.isPublished,
                priceInCents: tracks.priceInCents,
                maxTrackBookings: tracks.maxTrackBookings,
              })
              .from(tracks)
              .where(eq(tracks.id, trackId))
              .limit(1),
            tx
              .select({ id: users.id })
              .from(users)
              .where(eq(users.id, parsed.data.userId))
              .limit(1),
          ]);

          if (!track) {
            return { type: 'track_not_found' as const };
          }

          if (!track.isPublished) {
            return { type: 'track_not_published' as const };
          }

          if (!user) {
            return { type: 'user_not_found' as const };
          }

          const bookingResult = await executeTrackBookingWrite(tx, {
            trackId,
            userId: parsed.data.userId,
            bookingSource: 'manual',
            maxTrackBookings: track.maxTrackBookings,
            bookedAt: now,
            referenceTime: now,
            paidAt: now,
            pricePaidCents: parsed.data.amountPaidCents ?? track.priceInCents ?? 0,
            paymentId: null,
            manualReference: parsed.data.reference,
            grantedBy: actor.userId,
            grantReason: parsed.data.reason,
          });

          if (bookingResult.type === 'already_booked') {
            return { type: 'already_enrolled' as const };
          }

          return {
            type: 'created' as const,
            trackTitle: track.title,
            bookingId: bookingResult.bookingId,
            eventsRegistered: bookingResult.grantedCount,
            alreadyRegisteredEvents: bookingResult.existingCount,
          };
        });

        if (result.type === 'track_not_found') {
          return c.json({ error: { code: 'TRACK_NOT_FOUND', message: 'Track not found.' } }, 404);
        }

        if (result.type === 'track_not_published') {
          return c.json(
            {
              error: {
                code: 'TRACK_NOT_PUBLISHED',
                message: 'Publish the track before manually enrolling users into it.',
              },
            },
            400,
          );
        }

        if (result.type === 'user_not_found') {
          return c.json({ error: { code: 'USER_NOT_FOUND', message: 'User not found.' } }, 404);
        }

        if (result.type === 'already_enrolled') {
          return c.json(
            {
              error: {
                code: 'ALREADY_BOOKED',
                message: 'This user already has an active enrollment for the track.',
              },
            },
            409,
          );
        }

        return c.json(
          {
            success: true,
            bookingId: result.bookingId,
            trackTitle: result.trackTitle,
            eventsRegistered: result.eventsRegistered,
            alreadyRegisteredEvents: result.alreadyRegisteredEvents,
          },
          201,
        );
      },
      'TRACK_MANUAL_ENROLLMENT_FAILED',
      'Unable to manually enroll the user into this track.',
      'track manual enrollment',
    ),
  );

  app.post(
    '/tracks/:id/enrollments/:userId/revoke',
    handleRoute(
      async (c) => {
        const actor = await resolvedDeps.requireManager(c);
        if ('response' in actor) return actor.response;

        const rateLimited = resolvedDeps.consumeRateLimit(
          c,
          `track-enrollment:revoke:${actor.userId}`,
          TRACK_ENROLLMENT_MUTATION_RATE_LIMIT,
        );
        if (rateLimited) return rateLimited;

        const trackIdParsed = uuidPathParamSchema.safeParse(c.req.param('id'));
        if (!trackIdParsed.success) {
          return c.json(
            { error: { code: 'INVALID_PARAM', message: 'Track ID must be a valid UUID.' } },
            400,
          );
        }

        const userIdParsed = uuidPathParamSchema.safeParse(c.req.param('userId'));
        if (!userIdParsed.success) {
          return c.json(
            { error: { code: 'INVALID_PARAM', message: 'User ID must be a valid UUID.' } },
            400,
          );
        }

        const bodyResult = await resolvedDeps.extractJsonPayload(c);
        if (!bodyResult.ok) {
          return c.json(
            { error: { code: bodyResult.code, message: bodyResult.message } },
            jsonPayloadErrorStatusCode(bodyResult.code),
          );
        }

        const parsed = revokeEnrollmentSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
          return c.json({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } }, 400);
        }

        const trackId = trackIdParsed.data;
        const userId = userIdParsed.data;
        const revokedAt = resolvedDeps.now();

        const result = await db.transaction(async (tx) => {
          const [track] = await tx
            .select({ id: tracks.id })
            .from(tracks)
            .where(eq(tracks.id, trackId))
            .limit(1);

          if (!track) {
            return { type: 'track_not_found' as const };
          }

          return revokeTrackBookingAccess(tx, {
            trackId,
            userId,
            actorUserId: actor.userId,
            reason: parsed.data.reason,
            revokedAt,
          });
        });

        if (result.type === 'track_not_found') {
          return c.json({ error: { code: 'TRACK_NOT_FOUND', message: 'Track not found.' } }, 404);
        }

        if (result.type === 'not_found') {
          return c.json(
            { error: { code: 'BOOKING_NOT_FOUND', message: 'Active enrollment not found.' } },
            404,
          );
        }

        return c.json({
          success: true,
          revokedBookingId: result.bookingId,
          revokedEventCount: result.revokedEventCount,
        });
      },
      'TRACK_ENROLLMENT_REVOKE_FAILED',
      'Unable to revoke the track enrollment.',
      'track enrollment revoke',
    ),
  );
}
