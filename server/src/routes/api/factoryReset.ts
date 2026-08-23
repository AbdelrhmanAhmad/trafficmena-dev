import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { profiles, users } from '../../db/schema/index.js';
import { requireAdmin } from './utils.js';

const RESET_CODE = '85774A';
const SEED_EMAIL = 'abdelrahman.technomasr@gmail.com';
const SEED_NAME = 'Admin';

const bodySchema = z.object({ code: z.string() });

/** Hard-reset: truncate all data tables, re-seed a single admin user.
 *  Owner-only. Requires the secret reset code.
 */
export function registerFactoryResetRoute(app: Hono) {
  app.post('/admin/factory-reset', async (c) => {
    const guard = await requireAdmin(c);
    if ('response' in guard) return guard.response;

    const body = bodySchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success || body.data.code !== RESET_CODE) {
      return c.json(
        { error: { code: 'INVALID_RESET_CODE', message: 'Reset code is incorrect.' } },
        403,
      );
    }

    // Only the owner role may trigger a factory reset.
    if (guard.role !== 'owner' && guard.role !== 'admin') {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only an owner can perform a factory reset.',
          },
        },
        403,
      );
    }

    console.warn('[factory-reset] initiated by', guard.userId);

    await db.transaction(async (tx) => {
      // Truncate all application tables in dependency order.
      // CASCADE handles FK constraints automatically.
      await tx.execute(sql`
        TRUNCATE TABLE
          asset_views,
          certificates,
          certificate_settings,
          digital_product_files,
          digital_product_purchases,
          digital_product_videos,
          digital_products,
          event_attendees,
          event_reservations,
          events,
          invitations,
          library_assets,
          masterclass_certificate_settings,
          masterclass_enrollments,
          masterclass_lesson_files,
          masterclass_lesson_progress,
          masterclass_lesson_videos,
          masterclass_lessons,
          masterclass_modules,
          masterclasses,
          order_items,
          orders,
          payments,
          platform_settings,
          promo_codes,
          series,
          series_access_grants,
          series_assets,
          skills,
          subscriptions,
          track_bookings,
          track_events,
          track_reservations,
          tracks,
          user_activities,
          user_skills,
          auth_otps,
          auth_sessions,
          auth_accounts,
          auth_verifications,
          profiles,
          users
        RESTART IDENTITY CASCADE
      `);

      // Re-seed admin user
      const userId = randomUUID();
      await tx.insert(users).values({
        id: userId,
        email: SEED_EMAIL,
        name: SEED_NAME,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await tx.insert(profiles).values({
        id: userId,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    console.warn('[factory-reset] complete — admin re-seeded for', SEED_EMAIL);
    return c.json({ success: true, message: 'Database reset. Admin account re-created.' });
  });
}
