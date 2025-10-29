import { and, count, desc, eq, ilike } from 'drizzle-orm';
import type { Context, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { auth } from '../../auth.js';
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
import { getSessionFromRequest } from '../../utils/session.js';
import { normalizeEmail } from './utils.js';

const singleInviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  customMessage: z.string().max(600).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  status: z.enum(['pending', 'sent', 'accepted', 'expired', 'failed']).optional(),
  search: z.string().max(120).optional(),
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
      const params = parseQuery(c, listQuerySchema, {
        page: c.req.query('page'),
        pageSize: c.req.query('pageSize'),
        status: c.req.query('status'),
        search: c.req.query('search'),
      });
      return c.json(await fetchInvitations(params));
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
        const invitation = await acceptInvitation(token, payload);
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
        const invitation = await activateInvitation(token, payload.email);
        return c.json({ invitation, alreadyActivated: invitation.activatedAt !== null });
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

  if ((record?.role ?? 'user') !== 'admin') {
    return {
      response: c.json(
        { error: { code: 'FORBIDDEN', message: 'Admin privileges required.' } },
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

function parseQuery<T>(_c: Context, schema: z.ZodSchema<T>, value: unknown) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new InvitationError('INVALID_QUERY', result.error.message, 400);
  }
  return result.data;
}

type InvitationListParams = {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
};

async function fetchInvitations(params: InvitationListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(Math.max(1, params.pageSize ?? 25), 100);
  const offset = (page - 1) * pageSize;

  const filters: any[] = [];
  if (params.status) filters.push(eq(invitations.status, params.status as any));
  if (params.search) filters.push(ilike(invitations.email, `%${params.search}%`));

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
) {
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
    return existing;
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

  return updated;
}

async function activateInvitation(token: string, email: string): Promise<InvitationRecord> {
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

  if (existing.activatedAt) {
    return existing;
  }

  const [updated] = await db
    .update(invitations)
    .set({ activatedAt: new Date(), updatedAt: new Date() })
    .where(eq(invitations.id, existing.id))
    .returning();

  return updated;
}

function optional(value?: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}
