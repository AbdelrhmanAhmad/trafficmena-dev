import { randomBytes } from 'node:crypto';
import { and, count, eq, gte, inArray } from 'drizzle-orm';
import Papa from 'papaparse';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { invitations, profiles, users } from '../db/schema/index.js';
import { bilingualCustomMessageFields } from '../utils/bilingualDb.js';
import { resolveOptionalLocalizedText } from '../utils/localize.js';
import { EmailDeliveryError, sendInvitationEmail } from './email.js';
import type { AppLocale } from '../utils/locale.js';
import { DEFAULT_LOCALE } from '../utils/locale.js';

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
  customMessageEn?: string;
  customMessageAr?: string;
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
  locale: AppLocale = DEFAULT_LOCALE,
): Promise<InvitationRecord> {
  await ensureDailyLimit(admin.id);

  const email = normalizeEmail(input.email);
  const firstName = optional(input.firstName);
  const lastName = optional(input.lastName);
  const customMessageEn = optional(input.customMessageEn ?? input.customMessage);
  const customMessageAr = optional(input.customMessageAr ?? input.customMessage);
  const messageFields = bilingualCustomMessageFields(customMessageEn, customMessageAr);
  const localizedCustomMessage = resolveOptionalLocalizedText(
    customMessageEn,
    customMessageAr,
    locale,
  );
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
      ...messageFields,
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
    customMessage: localizedCustomMessage ?? undefined,
    locale,
  });

  return invite;
}

export async function sendBulkInvitations(
  admin: AdminContext,
  csvText: string,
  locale: AppLocale = DEFAULT_LOCALE,
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
      const invite = await sendSingleInvitation(
        admin,
        {
          email,
          firstName: row.firstName,
          lastName: row.lastName,
          customMessage: row.customMessage,
          customMessageEn: row.customMessageEn,
          customMessageAr: row.customMessageAr,
        },
        locale,
      );
      created.push(invite);
    } catch (error) {
      let reason = 'Unknown error';
      if (error instanceof InvitationError) {
        reason = error.message;
      } else if (error instanceof EmailDeliveryError) {
        reason = mapEmailDeliveryReason(error.code);
      }
      errors.push({ line: row.__line, email, reason });
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

function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
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
  const normalizedHeaders = firstRow.columns.map((column) => normalizeCsvHeader(column));
  const hasHeader = normalizedHeaders[0] === 'email';
  const dataRows = hasHeader ? restRows : rawRows;

  const headerIndex = hasHeader
    ? {
        email: normalizedHeaders.indexOf('email'),
        firstName: normalizedHeaders.findIndex((header) =>
          ['first_name', 'firstname', 'first'].includes(header),
        ),
        lastName: normalizedHeaders.findIndex((header) =>
          ['last_name', 'lastname', 'last'].includes(header),
        ),
        customMessage: normalizedHeaders.findIndex((header) => header === 'custom_message'),
        customMessageEn: normalizedHeaders.findIndex((header) =>
          ['custom_message_en', 'custommessageen'].includes(header),
        ),
        customMessageAr: normalizedHeaders.findIndex((header) =>
          ['custom_message_ar', 'custommessagear'].includes(header),
        ),
      }
    : null;

  const readColumn = (columns: string[], index: number | undefined) => {
    if (index === undefined || index < 0) return '';
    return (columns[index] ?? '').trim();
  };

  const rows = dataRows
    .map(({ columns, line }) => {
      const emailRaw = hasHeader ? readColumn(columns, headerIndex?.email) : readColumn(columns, 0);
      const firstNameRaw = hasHeader
        ? readColumn(columns, headerIndex?.firstName)
        : readColumn(columns, 1);
      const lastNameRaw = hasHeader
        ? readColumn(columns, headerIndex?.lastName)
        : readColumn(columns, 2);

      let customMessageEn: string | undefined;
      let customMessageAr: string | undefined;
      let customMessage: string | undefined;

      if (hasHeader && headerIndex) {
        customMessageEn = readColumn(columns, headerIndex.customMessageEn) || undefined;
        customMessageAr = readColumn(columns, headerIndex.customMessageAr) || undefined;
        customMessage = readColumn(columns, headerIndex.customMessage) || undefined;
      } else {
        const messageParts = columns.slice(3);
        const messageRaw = messageParts.length > 0 ? messageParts.join(',') : '';
        const normalizedMessage = messageRaw.replace(/\r\n/g, '\n');
        const trimmedMessage = normalizedMessage.trim();
        customMessage = trimmedMessage.length > 0 ? trimmedMessage : undefined;
      }

      return {
        email: emailRaw,
        firstName: firstNameRaw.length > 0 ? firstNameRaw : undefined,
        lastName: lastNameRaw.length > 0 ? lastNameRaw : undefined,
        customMessage,
        customMessageEn,
        customMessageAr,
        __line: line,
      };
    })
    .filter(
      (row) =>
        row.email.length > 0 ||
        row.firstName ||
        row.lastName ||
        row.customMessage ||
        row.customMessageEn ||
        row.customMessageAr,
    );

  return { rows, errors };
}

function isValidEmail(value: string) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Map Resend send-failure codes (EmailDeliveryError.code = Resend error.name) to actionable
// per-row reasons, so a failed bulk row says what went wrong instead of "Unknown error".
export function mapEmailDeliveryReason(code: string) {
  switch (code) {
    case 'rate_limit_exceeded':
      return 'Email provider rate limit hit. Retry this row shortly.';
    case 'validation_error':
      return 'Email rejected (unverified sender domain or invalid recipient).';
    case 'daily_quota_exceeded':
    case 'monthly_quota_exceeded':
      return 'Email sending quota exceeded. Try again later.';
    case 'restricted_api_key':
      return 'Email provider key lacks send permission. Contact an administrator.';
    default:
      return 'Email delivery failed.';
  }
}
