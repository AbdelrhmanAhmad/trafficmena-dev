import { and, count, desc, eq, ilike, sql } from 'drizzle-orm';
import type { Context, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { auth } from '../../auth.js';
import { env } from '../../config/env.js';
import { db } from '../../db/client.js';
import { invitations, profiles, users } from '../../db/schema/index.js';
import {
  type AdminContext,
  getOrCreateMember,
  InvitationError,
  type InvitationRecord,
  sendBulkInvitations,
  sendSingleInvitation,
} from '../../services/invitations.js';
import { invitationRateLimiter } from '../../services/rateLimiter.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { parseInvitationListQuery } from './invitations-list.js';
import { escapeLikePattern, getRequestIp, normalizeEmail } from './utils.js';

const singleInviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  customMessage: z.string().max(600).optional(),
});

const acceptSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
});

const activateSchema = z.object({
  email: z.string().email(),
});

export function registerInvitationRoutes(app: Hono) {
  app.get(
    '/invitations',
    adminRoute(async (c) => {
      const params = parseQuery(c, parseInvitationListQuery, {
        page: c.req.query('page'),
        pageSize: c.req.query('pageSize'),
        status: c.req.query('status'),
        search: c.req.query('search'),
      });
      return c.json(await fetchInvitations(params));
    }),
  );
  app.get(
    '/invitations/stats',
    adminRoute(async (c) => {
      const stats = await fetchInvitationStats();
      return c.json({ stats });
    }),
  );

  app.post(
    '/invitations/single',
    adminRoute(
      async (c, admin) => {
        const payload = await parseJson(c, singleInviteSchema);
        const invitation = await sendSingleInvitation(admin, payload);
        return c.json({ invitation });
      },
      'INVITATION_SEND_FAILED',
      'Unable to send invitation.',
      'single send failed',
    ),
  );

  app.post(
    '/invitations/bulk',
    adminRoute(
      async (c, admin) => {
        const csv = await extractCsvPayload(c);
        if (!csv) {
          throw new InvitationError(
            'INVALID_REQUEST',
            'Upload a CSV file with at least one row.',
            400,
          );
        }
        return c.json(await sendBulkInvitations(admin, csv));
      },
      'INVITATION_SEND_FAILED',
      'Unable to process CSV invitation upload.',
      'bulk send failed',
    ),
  );

  app.post(
    '/invitations/:token/accept',
    handle(
      async (c) => {
        const token = c.req.param('token');
        const payload = await parseJson(c, acceptSchema);
        const requestIp = getRequestIp(c);
        if (requestIp !== 'unknown') {
          const rateCheck = invitationRateLimiter.consume(`invite:accept:${requestIp}`, {
            limit: 5,
            windowMs: 60 * 60 * 1000,
          });
          if (!rateCheck.allowed) {
            throw new InvitationError(
              'INVITATION_RATE_LIMITED',
              'Too many attempts from this network. Please try again later.',
              429,
            );
          }
        }
        const { invitation, userId } = await acceptInvitation(token, payload);
        try {
          await auth.api.sendVerificationOTP({
            body: { email: normalizeEmail(payload.email), type: 'sign-in' },
            request: c.req.raw,
            headers: c.req.raw.headers,
          });
        } catch (error) {
          console.error('[invitations] OTP dispatch failed', error);
        }
        return c.json({
          invitation,
          alreadyAccepted: invitation.status === 'accepted' && invitation.acceptedAt !== null,
          userId,
        });
      },
      'INVITATION_ACCEPT_FAILED',
      'Unable to accept invitation.',
      'accept failed',
    ),
  );

  app.post(
    '/invitations/:token/activate',
    handle(
      async (c) => {
        const token = c.req.param('token');
        const payload = await parseJson(c, activateSchema);
        const result = await activateInvitation(c, token, payload.email);
        if (result.setCookie) {
          for (const value of result.setCookie) {
            c.header('set-cookie', value, { append: true });
          }
        }
        return c.json({
          invitation: result.invitation,
          alreadyActivated: result.alreadyActivated,
          sessionCreated: result.sessionCreated,
          userId: result.userId,
        });
      },
      'INVITATION_ACTIVATE_FAILED',
      'Unable to activate invitation.',
      'activate failed',
    ),
  );
}

type AdminGuardSuccess = { context: AdminContext };
type AdminGuardFailure = { response: Response };

function handle(
  handler: (c: Context) => Promise<Response>,
  fallbackCode: string,
  fallbackMessage: string,
  logLabel = fallbackCode.toLowerCase(),
) {
  return async (c: Context) => {
    try {
      return await handler(c);
    } catch (error) {
      if (error instanceof InvitationError) {
        return respondError(c, error);
      }
      console.error(`[invitations] ${logLabel}`, error);
      return respondError(c, new InvitationError(fallbackCode, fallbackMessage, 500));
    }
  };
}

function adminRoute(
  handler: (c: Context, admin: AdminContext) => Promise<Response>,
  fallbackCode = 'INTERNAL_ERROR',
  fallbackMessage = 'Something went wrong.',
  logLabel = 'admin route failed',
) {
  return handle(
    async (c) => {
      const admin = await requireAdmin(c);
      if ('response' in admin) return admin.response;
      return handler(c, admin.context);
    },
    fallbackCode,
    fallbackMessage,
    logLabel,
  );
}

async function requireAdmin(c: Context): Promise<AdminGuardSuccess | AdminGuardFailure> {
  const session = await getSessionFromRequest(c);
  if (!session || !session.user) {
    return {
      response: c.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        401,
      ),
    };
  }

  const [record] = await db
    .select({
      role: profiles.role,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      name: users.name,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.id))
    .where(eq(profiles.id, session.user.id))
    .limit(1);

  const role = (record?.role ?? 'user').toLowerCase();

  if (role !== 'admin' && role !== 'owner' && role !== 'manager') {
    return {
      response: c.json(
        { error: { code: 'FORBIDDEN', message: 'Manager or admin privileges required.' } },
        403,
      ),
    };
  }

  return {
    context: {
      id: session.user.id,
      firstName: record?.firstName ?? null,
      lastName: record?.lastName ?? null,
      displayName: record?.name ?? null,
    },
  };
}

async function extractCsvPayload(c: Context): Promise<string | null> {
  const contentType = c.req.header('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const body = await c.req.parseBody();
    const candidate = body.file ?? body.files ?? body.csv;

    if (!candidate) return null;
    const first = Array.isArray(candidate) ? candidate[0] : candidate;

    if (!first) return null;
    if (typeof first === 'string') return first;
    if (typeof (first as any).text === 'function') {
      return (first as any).text();
    }
    return null;
  }

  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    return c.req.text();
  }

  return null;
}

function respondError(c: Context, error: InvitationError) {
  return c.json(
    { error: { code: error.code, message: error.message } },
    error.status as ContentfulStatusCode,
  );
}

async function parseJson<T>(c: Context, schema: z.ZodSchema<T>) {
  const result = schema.safeParse(await c.req.json().catch(() => ({})));
  if (!result.success) {
    throw new InvitationError('INVALID_REQUEST', result.error.message, 400);
  }
  return result.data;
}

function parseQuery<T>(
  _c: Context,
  parser: (value: unknown) => { success: true; data: T } | { success: false; error: z.ZodError },
  value: unknown,
) {
  const result = parser(value);
  if (!result.success) {
    throw new InvitationError('INVALID_QUERY', result.error.message, 400);
  }
  return result.data;
}

type InvitationListParams = {
  page: number;
  pageSize: number;
  status?: string;
  search?: string;
};

type InvitationStats = {
  total: number;
  pending: number;
  sent: number;
  accepted: number;
  expired: number;
  failed: number;
  activated: number;
};

async function fetchInvitationStats(): Promise<InvitationStats> {
  const [row] = await db
    .select({
      total: count(invitations.id),
      pending: sql<number>`sum(case when ${invitations.status} = 'pending' then 1 else 0 end)`,
      sent: sql<number>`sum(case when ${invitations.status} = 'sent' then 1 else 0 end)`,
      accepted: sql<number>`sum(case when ${invitations.status} = 'accepted' then 1 else 0 end)`,
      expired: sql<number>`sum(case when ${invitations.status} = 'expired' then 1 else 0 end)`,
      failed: sql<number>`sum(case when ${invitations.status} = 'failed' then 1 else 0 end)`,
      activated: sql<number>`sum(case when ${invitations.activatedAt} is not null then 1 else 0 end)`,
    })
    .from(invitations);

  return {
    total: Number(row?.total ?? 0),
    pending: Number(row?.pending ?? 0),
    sent: Number(row?.sent ?? 0),
    accepted: Number(row?.accepted ?? 0),
    expired: Number(row?.expired ?? 0),
    failed: Number(row?.failed ?? 0),
    activated: Number(row?.activated ?? 0),
  };
}

async function fetchInvitations(params: InvitationListParams) {
  const page = params.page;
  const pageSize = params.pageSize;
  const offset = (page - 1) * pageSize;

  const filters: any[] = [];
  if (params.status) filters.push(eq(invitations.status, params.status as any));
  if (params.search)
    filters.push(ilike(invitations.email, `%${escapeLikePattern(params.search)}%`));

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const items = await db
    .select()
    .from(invitations)
    .where(whereClause)
    .orderBy(desc(invitations.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count(invitations.id) })
    .from(invitations)
    .where(whereClause);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total: Number(total ?? 0),
    },
  };
}

async function acceptInvitation(
  token: string,
  payload: { email: string; firstName?: string; lastName?: string },
): Promise<{ invitation: InvitationRecord; userId: string }> {
  const email = normalizeEmail(payload.email);
  const [existing] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.token, token), eq(invitations.email, email)))
    .limit(1);

  if (!existing) {
    throw new InvitationError(
      'INVITATION_NOT_FOUND',
      'Invitation is invalid or already revoked.',
      404,
    );
  }

  if (existing.expiresAt && existing.expiresAt.getTime() < Date.now()) {
    await db
      .update(invitations)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(invitations.id, existing.id));
    throw new InvitationError(
      'INVITATION_EXPIRED',
      'This invitation has expired. Please request a new link.',
      410,
    );
  }

  if (existing.acceptedAt) {
    let userId = existing.acceptedUserId;
    if (!userId) {
      userId = await getOrCreateMember(email, {
        firstName: payload.firstName,
        lastName: payload.lastName,
      });
      await db
        .update(invitations)
        .set({
          acceptedUserId: userId,
          updatedAt: new Date(),
        })
        .where(eq(invitations.id, existing.id));
    }
    return { invitation: existing, userId };
  }

  const userId = await getOrCreateMember(email, {
    firstName: payload.firstName,
    lastName: payload.lastName,
  });

  const now = new Date();
  const [updated] = await db
    .update(invitations)
    .set({
      status: 'accepted',
      acceptedAt: now,
      acceptedUserId: userId,
      firstName: optional(payload.firstName),
      lastName: optional(payload.lastName),
      updatedAt: now,
    })
    .where(eq(invitations.id, existing.id))
    .returning();

  return { invitation: updated, userId };
}

type ActivationResult = {
  invitation: InvitationRecord;
  alreadyActivated: boolean;
  sessionCreated: boolean;
  userId?: string;
  setCookie?: string[];
};

async function activateInvitation(
  c: Context,
  token: string,
  email: string,
): Promise<ActivationResult> {
  const normalized = normalizeEmail(email);
  const [existing] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.token, token), eq(invitations.email, normalized)))
    .limit(1);

  if (!existing) {
    throw new InvitationError(
      'INVITATION_NOT_FOUND',
      'Invitation is invalid or already revoked.',
      404,
    );
  }

  if (!existing.acceptedAt) {
    throw new InvitationError(
      'INVITATION_NOT_ACCEPTED',
      'This invitation has not been accepted yet.',
      409,
    );
  }

  let inviteeUserId = existing.acceptedUserId;
  if (!inviteeUserId) {
    inviteeUserId = await getOrCreateMember(normalized, {
      firstName: existing.firstName ?? undefined,
      lastName: existing.lastName ?? undefined,
    });
    await db
      .update(invitations)
      .set({ acceptedUserId: inviteeUserId, updatedAt: new Date() })
      .where(eq(invitations.id, existing.id));
  }

  let sessionCreated = false;
  const setCookieValues: string[] = [];

  if (inviteeUserId && env.INVITE_SESSION_SECRET) {
    try {
      const headers = new Headers(c.req.raw.headers);
      headers.set('x-invite-session-secret', env.INVITE_SESSION_SECRET);

      const sessionResponse = await (auth.api as any).internalInviteSession({
        body: { userId: inviteeUserId },
        request: c.req.raw,
        headers,
        asResponse: true,
      });

      if (sessionResponse.ok) {
        sessionCreated = true;
        const rawSetCookie: string[] | undefined =
          typeof (sessionResponse.headers as unknown as { raw?: () => Record<string, string[]> })
            .raw === 'function'
            ? (sessionResponse.headers as unknown as { raw: () => Record<string, string[]> }).raw()[
                'set-cookie'
              ]
            : undefined;

        if (rawSetCookie && rawSetCookie.length > 0) {
          setCookieValues.push(...rawSetCookie);
        } else {
          const singleCookie = sessionResponse.headers.get('set-cookie');
          if (singleCookie) {
            setCookieValues.push(singleCookie);
          }
        }
      } else {
        const errorBody = await sessionResponse.text();
        console.error('[invitations] auto session creation failed', {
          status: sessionResponse.status,
          body: errorBody,
        });
      }
    } catch (error) {
      sessionCreated = false;
      console.error('[invitations] auto session creation failed', error);
    }
  } else if (!env.INVITE_SESSION_SECRET) {
    console.warn('[invitations] invite session secret not configured; skipping auto session setup');
  }

  let updatedInvitation = existing;
  if (!existing.activatedAt) {
    const now = new Date();
    const [updated] = await db
      .update(invitations)
      .set({ activatedAt: now, updatedAt: now })
      .where(eq(invitations.id, existing.id))
      .returning();
    updatedInvitation = updated ?? existing;
  }

  return {
    invitation: updatedInvitation,
    alreadyActivated: existing.activatedAt !== null,
    sessionCreated,
    userId: inviteeUserId ?? undefined,
    setCookie: setCookieValues.length > 0 ? setCookieValues : undefined,
  };
}

function optional(value?: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}
