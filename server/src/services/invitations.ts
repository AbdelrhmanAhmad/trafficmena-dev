import { randomBytes } from 'node:crypto';
import { and, count, eq, gte, inArray } from 'drizzle-orm';
import Papa from 'papaparse';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { invitations, profiles, users } from '../db/schema/index.js';
import { sendInvitationEmail } from './email.js';

const DAILY_LIMIT = env.INVITATION_DAILY_LIMIT;

export type AdminContext = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
};

export type InvitationRecord = typeof invitations.$inferSelect;

export type InvitationInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  customMessage?: string;
};

export type BulkInvitationResult = {
  created: InvitationRecord[];
  errors: Array<{ line: number; email: string; reason: string }>;
};

const INVITATION_EXPIRY_HOURS = 72;

export class InvitationError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function sendSingleInvitation(
  admin: AdminContext,
  input: InvitationInput,
): Promise<InvitationRecord> {
  await ensureDailyLimit(admin.id);

  const email = normalizeEmail(input.email);
  const firstName = optional(input.firstName);
  const lastName = optional(input.lastName);
  const customMessage = optional(input.customMessage);
  const now = new Date();
  const token = randomBytes(20).toString('hex');
  const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

  await db
    .update(invitations)
    .set({ status: 'expired', updatedAt: now })
    .where(and(eq(invitations.email, email), inArray(invitations.status, ['pending', 'sent'])));

  const [invite] = await db
    .insert(invitations)
    .values({
      email,
      firstName,
      lastName,
      customMessage,
      token,
      source: 'single',
      status: 'pending',
      createdBy: admin.id,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await sendInvitationEmail({
    email,
    invitationLink: buildInvitationLink(token, email),
    expiresAt,
    firstName: firstName ?? undefined,
    inviterName: buildAdminName(admin),
    customMessage: customMessage ?? undefined,
  });

  return invite;
}

export async function sendBulkInvitations(
  admin: AdminContext,
  csvText: string,
): Promise<BulkInvitationResult> {
  const { rows, errors: parseErrors } = parseCsv(csvText);
  const created: InvitationRecord[] = [];
  const errors: Array<{ line: number; email: string; reason: string }> = [...parseErrors];

  const candidates = rows.filter((row) => row.email.trim().length > 0);

  if (candidates.length === 0) {
    if (rows.length > 0) {
      for (const row of rows) {
        errors.push({
          line: row.__line,
          email: '',
          reason: 'Missing email address.',
        });
      }
      return { created, errors };
    }
    if (errors.length > 0) {
      return { created, errors };
    }
    return { created, errors: [{ line: 1, email: '', reason: 'CSV file is empty.' }] };
  }

  const countToday = await countInvitesToday(admin.id);
  if (countToday + candidates.length > DAILY_LIMIT) {
    return {
      created,
      errors: [
        ...errors,
        {
          line: 0,
          email: '',
          reason: `Daily invitation limit exceeded (${DAILY_LIMIT}/day). Try again tomorrow.`,
        },
      ],
    };
  }

  for (const row of rows) {
    const email = row.email.trim();
    if (!email) {
      errors.push({
        line: row.__line,
        email: '',
        reason: 'Missing email address.',
      });
      continue;
    }

    if (!isValidEmail(email)) {
      errors.push({
        line: row.__line,
        email,
        reason: 'Invalid email address.',
      });
      continue;
    }

    try {
      const invite = await sendSingleInvitation(admin, {
        email,
        firstName: row.firstName,
        lastName: row.lastName,
        customMessage: row.customMessage,
      });
      created.push(invite);
    } catch (error) {
      errors.push({
        line: row.__line,
        email,
        reason: error instanceof InvitationError ? error.message : 'Unknown error',
      });
    }
  }

  return { created, errors };
}

export async function getOrCreateMember(
  email: string,
  names?: { firstName?: string; lastName?: string },
) {
  const normalized = normalizeEmail(email);
  const firstName = optional(names?.firstName);
  const lastName = optional(names?.lastName);
  const now = new Date();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const [created] = await db
    .insert(users)
    .values({
      email: normalized,
      name: buildFullName(firstName, lastName) ?? undefined,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: users.id });

  await db.insert(profiles).values({
    id: created.id,
    firstName,
    lastName,
    createdAt: now,
    updatedAt: now,
  });

  return created.id;
}

function optional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function buildInvitationLink(token: string, email: string) {
  const base = env.APP_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8080';
  const params = new URLSearchParams({ invitation: token, email });
  return `${base}/invitation/${token}?${params.toString()}`;
}

function buildAdminName(admin: AdminContext) {
  const name = [admin.firstName?.trim(), admin.lastName?.trim()].filter(Boolean).join(' ');
  return name || admin.displayName?.trim() || 'TrafficMENA team';
}

function buildFullName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

async function ensureDailyLimit(adminId: string) {
  const count = await countInvitesToday(adminId);
  if (count >= DAILY_LIMIT) {
    throw new InvitationError(
      'INVITATION_LIMIT_REACHED',
      `Daily invitation limit reached (${DAILY_LIMIT}/day). Try again tomorrow.`,
      429,
    );
  }
}

async function countInvitesToday(adminId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [{ total }] = await db
    .select({ total: count(invitations.id) })
    .from(invitations)
    .where(and(eq(invitations.createdBy, adminId), gte(invitations.createdAt, start)));

  return Number(total ?? 0);
}

function parseCsv(text: string): {
  rows: Array<InvitationInput & { __line: number }>;
  errors: Array<{ line: number; email: string; reason: string }>;
} {
  const source = typeof text === 'string' ? text : '';
  if (source.trim().length === 0) {
    return { rows: [], errors: [] };
  }

  const rawRows: Array<{ columns: string[]; line: number }> = [];
  const errors: Array<{ line: number; email: string; reason: string }> = [];

  let previousCursor = 0;
  let currentLine = 1;

  const result = Papa.parse<string[]>(source, {
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
    header: false,
    worker: false,
    step: (stepResult) => {
      const { data, meta } = stepResult;
      const segment = source.slice(previousCursor, meta.cursor);
      const newlineMatches = segment.match(/\r\n|\n|\r/g);
      const newlineCount = newlineMatches ? newlineMatches.length : 0;
      const lineNumber = currentLine;

      currentLine += Math.max(newlineCount, 1);
      previousCursor = meta.cursor;

      const columns = Array.isArray(data) ? data : [String(data ?? '')];
      if (columns.every((value) => (value ?? '').toString().trim().length === 0)) {
        return;
      }

      rawRows.push({
        columns: columns.map((value) =>
          typeof value === 'string' ? value : value == null ? '' : String(value),
        ),
        line: lineNumber,
      });
    },
  });

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      const rowIndex = typeof err.row === 'number' ? err.row : null;
      const associatedRow = rowIndex !== null ? rawRows[rowIndex] : undefined;
      errors.push({
        line: associatedRow?.line ?? 0,
        email: associatedRow?.columns?.[0] ?? '',
        reason: err.message ?? 'Unable to parse row.',
      });
    }
  }

  if (rawRows.length === 0) {
    return { rows: [], errors };
  }

  const [firstRow, ...restRows] = rawRows;
  const hasHeader = firstRow.columns[0]?.trim().toLowerCase() === 'email';
  const dataRows = hasHeader ? restRows : rawRows;

  const rows = dataRows
    .map(({ columns, line }) => {
      const emailRaw = (columns[0] ?? '').trim();
      const firstNameRaw = (columns[1] ?? '').trim();
      const lastNameRaw = (columns[2] ?? '').trim();
      const messageParts = columns.slice(3);
      const messageRaw = messageParts.length > 0 ? messageParts.join(',') : '';
      const normalizedMessage = messageRaw.replace(/\r\n/g, '\n');
      const trimmedMessage = normalizedMessage.trim();

      return {
        email: emailRaw,
        firstName: firstNameRaw.length > 0 ? firstNameRaw : undefined,
        lastName: lastNameRaw.length > 0 ? lastNameRaw : undefined,
        customMessage: trimmedMessage.length > 0 ? trimmedMessage : undefined,
        __line: line,
      };
    })
    .filter((row) => row.email.length > 0 || row.firstName || row.lastName || row.customMessage);

  return { rows, errors };
}

function isValidEmail(value: string) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
