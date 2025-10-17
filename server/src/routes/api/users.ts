import { eq, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { profiles, users } from '../../db/schema/index.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { notImplemented } from './utils.js';

const updateMeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  phoneNumber: z.string().max(50).optional(),
  experienceLevel: z.string().max(255).optional(),
  primaryGoal: z.string().max(255).optional(),
  primaryChallenge: z.string().max(255).optional(),
});

const listUsersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(10),
});

export function registerUserRoutes(app: Hono) {
  app.get('/users', async (c) => {
    const session = await getSessionFromRequest(c);

    if (!session || !session.user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          },
        },
        401,
      );
    }

    const adminProfile = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, session.user.id))
      .limit(1);

    if ((adminProfile[0]?.role ?? 'user') !== 'admin') {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Admin privileges required.',
          },
        },
        403,
      );
    }

    const parsed = listUsersSchema.safeParse({
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
    });

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_QUERY',
            message: parsed.error.message,
          },
        },
        400,
      );
    }

    const { page, pageSize } = parsed.data;
    const offset = (page - 1) * pageSize;

    const items = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
        role: profiles.role,
        userType: profiles.userType,
      })
      .from(users)
      .leftJoin(profiles, eq(users.id, profiles.id))
      .orderBy(users.createdAt)
      .limit(pageSize)
      .offset(offset);

    const totalResult = await db.select({ count: sql<number>`COUNT(*)` }).from(users);

    return c.json({
      items,
      pagination: {
        page,
        pageSize,
        total: Number(totalResult[0]?.count ?? 0),
      },
    });
  });

  app.get('/users/me', async (c) => {
    const session = await getSessionFromRequest(c);

    if (!session || !session.user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          },
        },
        401,
      );
    }

    const [profile] = await db
      .select({
        id: profiles.id,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        phoneNumber: profiles.phoneNumber,
        role: profiles.role,
        userType: profiles.userType,
        experienceLevel: profiles.experienceLevel,
        primaryGoal: profiles.primaryGoal,
        primaryChallenge: profiles.primaryChallenge,
        subscriptionStatus: profiles.subscriptionStatus,
      })
      .from(profiles)
      .where(eq(profiles.id, session.user.id));

    return c.json({
      user: session.user,
      profile: profile ?? null,
    });
  });

  app.put('/users/me', async (c) => {
    const session = await getSessionFromRequest(c);

    if (!session || !session.user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          },
        },
        401,
      );
    }

    const body = updateMeSchema.safeParse(await c.req.json().catch(() => ({})));

    if (!body.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: body.error.message,
          },
        },
        400,
      );
    }

    const updates = body.data;

    if (Object.keys(updates).length === 0) {
      return c.json({ success: true, message: 'No changes applied.' });
    }

    if (updates.name) {
      await db.update(users).set({ name: updates.name }).where(eq(users.id, session.user.id));
    }

    const profileUpdates = {
      firstName: updates.firstName,
      lastName: updates.lastName,
      phoneNumber: updates.phoneNumber,
      experienceLevel: updates.experienceLevel,
      primaryGoal: updates.primaryGoal,
      primaryChallenge: updates.primaryChallenge,
    };

    const cleanProfileUpdates = Object.fromEntries(
      Object.entries(profileUpdates).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(cleanProfileUpdates).length > 0) {
      const existing = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.id, session.user.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(profiles).values({
          id: session.user.id,
          ...cleanProfileUpdates,
        });
      } else {
        await db.update(profiles).set(cleanProfileUpdates).where(eq(profiles.id, session.user.id));
      }
    }

    return c.json({ success: true });
  });

  app.get('/users/:id', (c) => notImplemented(c, { feature: 'users.detail' }));
  app.put('/users/:id', (c) => notImplemented(c, { feature: 'users.update' }));
}
