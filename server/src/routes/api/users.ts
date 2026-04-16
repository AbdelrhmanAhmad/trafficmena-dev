import { and, desc, eq, ilike, inArray, isNull, or, type SQL, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { eventAttendees, payments, profiles, users } from '../../db/schema/index.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { parseUsersListQuery } from './users-list.js';
import { normalizePhoneNumber, validatePhoneNumberUpdate } from './users-phone.js';
import { escapeLikePattern, normalizeRole, notImplemented, requireRole } from './utils.js';

const updateMeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  phoneNumber: z.string().max(30).transform(normalizePhoneNumber).optional(),
  experienceLevel: z.string().max(255).optional(),
  primaryGoal: z.string().max(255).optional(),
  primaryChallenge: z.string().max(255).optional(),
});

const roleValues = ['owner', 'admin', 'manager', 'expert', 'user'] as const;

const updateUserRoleSchema = z.object({
  role: z.enum(roleValues),
});

const uuidPathParamSchema = z.string().uuid();

const isEmptyValue = (value: string | null | undefined) => !value || value.trim().length === 0;

const getActiveSubscriptionSelectors = (now: Date) => ({
  exists: sql<boolean>`EXISTS (
    SELECT 1
    FROM subscriptions s
    WHERE s.user_id = ${users.id}
      AND s.subscription_status = 'active'
      AND s.revoked_at IS NULL
      AND s.ends_at >= ${now}
  )`,
  notExists: sql<boolean>`NOT EXISTS (
    SELECT 1
    FROM subscriptions s
    WHERE s.user_id = ${users.id}
      AND s.subscription_status = 'active'
      AND s.revoked_at IS NULL
      AND s.ends_at >= ${now}
  )`,
  source: sql<'paid' | 'legacy' | 'gift' | null>`(
    SELECT s.source
    FROM subscriptions s
    WHERE s.user_id = ${users.id}
      AND s.subscription_status = 'active'
      AND s.revoked_at IS NULL
      AND s.ends_at >= ${now}
    ORDER BY s.ends_at DESC
    LIMIT 1
  )`,
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

    const normalizedRole = (adminProfile[0]?.role ?? 'user').toLowerCase();
    if (normalizedRole !== 'admin' && normalizedRole !== 'owner' && normalizedRole !== 'manager') {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Manager or admin privileges required.',
          },
        },
        403,
      );
    }

    const parsed = parseUsersListQuery({
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
      search: c.req.query('search'),
      role: c.req.query('role'),
      subscription: c.req.query('subscription'),
      fields: c.req.query('fields'),
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

    const { page, pageSize, role, search, subscription, fields } = parsed.data;
    const offset = (page - 1) * pageSize;
    const isBasicFields = fields === 'basic';

    const now = new Date();
    const subscriptionSelectors = getActiveSubscriptionSelectors(now);

    const filters: SQL<unknown>[] = [];

    if (search) {
      const pattern = `%${escapeLikePattern(search)}%`;
      const searchFilter = or(ilike(users.email, pattern), ilike(users.name, pattern));
      if (searchFilter) {
        filters.push(searchFilter);
      }
    }

    if (role) {
      if (role === 'user') {
        const userRoleFilter = or(eq(profiles.role, role), isNull(profiles.role));
        if (userRoleFilter) {
          filters.push(userRoleFilter);
        }
      } else {
        filters.push(eq(profiles.role, role));
      }
    }

    if (!isBasicFields && subscription === 'subscribed') {
      filters.push(subscriptionSelectors.exists);
    } else if (!isBasicFields && subscription === 'not_subscribed') {
      filters.push(subscriptionSelectors.notExists);
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const countQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .leftJoin(profiles, eq(users.id, profiles.id))
      .where(whereClause);

    if (isBasicFields) {
      const [items, totalResult] = await Promise.all([
        db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            createdAt: users.createdAt,
            role: profiles.role,
            userType: profiles.userType,
            phoneNumber: profiles.phoneNumber,
          })
          .from(users)
          .leftJoin(profiles, eq(users.id, profiles.id))
          .where(whereClause)
          .orderBy(desc(users.createdAt), desc(users.id))
          .limit(pageSize)
          .offset(offset),
        countQuery,
      ]);

      return c.json({
        items,
        pagination: {
          page,
          pageSize,
          total: Number(totalResult[0]?.count ?? 0),
        },
      });
    }

    const [items, totalResult] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          createdAt: users.createdAt,
          role: profiles.role,
          userType: profiles.userType,
          phoneNumber: profiles.phoneNumber,
          isSubscriber: subscriptionSelectors.exists,
          activeSubscriptionSource: subscriptionSelectors.source,
        })
        .from(users)
        .leftJoin(profiles, eq(users.id, profiles.id))
        .where(whereClause)
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(pageSize)
        .offset(offset),
      countQuery,
    ]);

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

    const [profileRows, userRows, purchaseStatRows, registrationStatRows] = await Promise.all([
      db
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
        .where(eq(profiles.id, session.user.id))
        .limit(1),
      db
        .select({ createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1),
      db
        .select({
          count: sql<number>`count(*)::int`,
          revenueCents: sql<number>`COALESCE(sum(${payments.amountCents}), 0)::int`,
        })
        .from(payments)
        .where(and(eq(payments.userId, session.user.id), eq(payments.status, 'paid')))
        .limit(1),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventAttendees)
        .where(
          and(
            eq(eventAttendees.userId, session.user.id),
            inArray(eventAttendees.status, ['active', 'refund_requested']),
          ),
        )
        .limit(1),
    ]);

    const profile = profileRows[0] ?? null;
    const userRecord = userRows[0] ?? null;
    const purchaseStats = purchaseStatRows[0] ?? null;
    const registrationStats = registrationStatRows[0] ?? null;

    return c.json({
      user: session.user,
      profile,
      totalPaidPurchases: purchaseStats?.count ?? 0,
      totalRegistrations: registrationStats?.count ?? 0,
      totalRevenueCents: purchaseStats?.revenueCents ?? 0,
      accountCreationDate: userRecord?.createdAt ?? null,
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
    const mode = c.req.query('mode');
    const isSignupMode = mode === 'signup';

    if (Object.keys(updates).length === 0) {
      return c.json({ success: true, message: 'No changes applied.' });
    }

    const [existingUser] = isSignupMode
      ? await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, session.user.id))
          .limit(1)
      : [];

    if (updates.name && (!isSignupMode || isEmptyValue(existingUser?.name))) {
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
      if (isSignupMode) {
        const [existingProfile] = await db
          .select({
            id: profiles.id,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            phoneNumber: profiles.phoneNumber,
            experienceLevel: profiles.experienceLevel,
            primaryGoal: profiles.primaryGoal,
            primaryChallenge: profiles.primaryChallenge,
          })
          .from(profiles)
          .where(eq(profiles.id, session.user.id))
          .limit(1);

        if (updates.phoneNumber !== undefined) {
          const existingPhoneNumber = existingProfile?.phoneNumber ?? null;
          const shouldValidatePhone = isEmptyValue(existingPhoneNumber);
          const validation = validatePhoneNumberUpdate({
            incomingNormalized: updates.phoneNumber,
            existing: existingPhoneNumber,
          });

          if (validation.ok && validation.isUnchanged) {
            delete cleanProfileUpdates.phoneNumber;
          } else if (!validation.ok && shouldValidatePhone) {
            return c.json(
              {
                error: {
                  code: 'INVALID_REQUEST',
                  message: validation.message,
                },
              },
              400,
            );
          }
        }

        if (Object.keys(cleanProfileUpdates).length === 0) {
          return c.json({ success: true });
        }

        if (!existingProfile) {
          await db.insert(profiles).values({
            id: session.user.id,
            ...cleanProfileUpdates,
          });
        } else {
          const guardedUpdates = Object.fromEntries(
            Object.entries(cleanProfileUpdates).filter(([key]) => {
              const currentValue = existingProfile[key as keyof typeof existingProfile] as
                | string
                | null
                | undefined;
              return isEmptyValue(currentValue);
            }),
          );

          if (Object.keys(guardedUpdates).length > 0) {
            await db.update(profiles).set(guardedUpdates).where(eq(profiles.id, session.user.id));
          }
        }
      } else {
        const [existingProfile] = await db
          .select({ id: profiles.id, phoneNumber: profiles.phoneNumber })
          .from(profiles)
          .where(eq(profiles.id, session.user.id))
          .limit(1);

        if (updates.phoneNumber !== undefined) {
          const validation = validatePhoneNumberUpdate({
            incomingNormalized: updates.phoneNumber,
            existing: existingProfile?.phoneNumber ?? null,
          });

          if (validation.ok && validation.isUnchanged) {
            delete cleanProfileUpdates.phoneNumber;
          } else if (!validation.ok) {
            return c.json(
              {
                error: {
                  code: 'INVALID_REQUEST',
                  message: validation.message,
                },
              },
              400,
            );
          }
        }

        if (Object.keys(cleanProfileUpdates).length === 0) {
          return c.json({ success: true });
        }

        if (!existingProfile) {
          await db.insert(profiles).values({
            id: session.user.id,
            ...cleanProfileUpdates,
          });
        } else {
          await db
            .update(profiles)
            .set(cleanProfileUpdates)
            .where(eq(profiles.id, session.user.id));
        }
      }
    }

    return c.json({ success: true });
  });

  app.get('/users/:id', (c) => notImplemented(c, { feature: 'users.detail' }));

  app.put('/users/:id', async (c) => {
    const actor = await requireRole(c, ['owner', 'admin'], {
      forbiddenMessage: 'Owner privileges required.',
    });
    if ('response' in actor) return actor.response;

    const targetIdParsed = uuidPathParamSchema.safeParse(c.req.param('id'));
    if (!targetIdParsed.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_PARAM',
            message: 'User ID must be a valid UUID.',
          },
        },
        400,
      );
    }
    const targetId = targetIdParsed.data;

    const body = updateUserRoleSchema.safeParse(await c.req.json().catch(() => ({})));
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

    const desiredRole = body.data.role;

    if (desiredRole === 'owner' && actor.role !== 'owner') {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only owners can grant owner access.',
          },
        },
        403,
      );
    }

    const [target] = await db
      .select({ id: profiles.id, role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, targetId))
      .limit(1);

    const currentRole = normalizeRole(target?.role);

    if (actor.userId === targetId && desiredRole !== 'owner') {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You cannot remove your own owner access.',
          },
        },
        403,
      );
    }

    if (currentRole === 'owner' && desiredRole !== 'owner') {
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(profiles)
        .where(eq(profiles.role, 'owner'));

      if (Number(count ?? 0) <= 1) {
        return c.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'Cannot remove the last owner on the account.',
            },
          },
          403,
        );
      }
    }

    await db
      .update(profiles)
      .set({ role: desiredRole, updatedAt: sql`now()` })
      .where(eq(profiles.id, targetId));

    const now = new Date();
    const subscriptionSelectors = getActiveSubscriptionSelectors(now);

    const [updated] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
        phoneNumber: profiles.phoneNumber,
        role: profiles.role,
        userType: profiles.userType,
        isSubscriber: subscriptionSelectors.exists,
        activeSubscriptionSource: subscriptionSelectors.source,
      })
      .from(users)
      .leftJoin(profiles, eq(users.id, profiles.id))
      .where(eq(users.id, targetId))
      .limit(1);

    if (!updated) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'User not found.',
          },
        },
        404,
      );
    }

    return c.json({ success: true, user: updated });
  });

  app.delete('/users/:id', async (c) => {
    const actor = await requireRole(c, ['owner', 'admin'], {
      forbiddenMessage: 'Owner privileges required.',
    });
    if ('response' in actor) return actor.response;

    const targetIdParsed = uuidPathParamSchema.safeParse(c.req.param('id'));
    if (!targetIdParsed.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_PARAM',
            message: 'User ID must be a valid UUID.',
          },
        },
        400,
      );
    }
    const targetId = targetIdParsed.data;

    if (actor.userId === targetId) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You cannot delete your own account.',
          },
        },
        403,
      );
    }

    const [target] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, targetId))
      .limit(1);

    const targetRole = normalizeRole(target?.role);

    if (actor.role === 'admin' && targetRole === 'owner') {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Admins cannot delete owners.',
          },
        },
        403,
      );
    }

    if (targetRole === 'owner') {
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(profiles)
        .where(eq(profiles.role, 'owner'));

      if (Number(count ?? 0) <= 1) {
        return c.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'Cannot delete the last owner on the account.',
            },
          },
          403,
        );
      }
    }

    await db.delete(users).where(eq(users.id, targetId));

    return c.json({ success: true });
  });
}
