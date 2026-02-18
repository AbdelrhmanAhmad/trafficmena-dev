import Papa from 'papaparse';
import { z } from 'zod';
import type {
  SubscriptionGrantCsvError,
  SubscriptionGrantCsvRow,
} from './subscriptionsGrantUtils.js';
import { MAX_CSV_ROWS } from './utils.js';

export const subscriptionGrantSourceSchema = z.enum(['legacy', 'gift']);

export const createSubscriptionGrantSchema = z.object({
  userId: z.string().uuid(),
  source: subscriptionGrantSourceSchema,
  reason: z.string().trim().min(3).max(500),
});

export const revokeSubscriptionGrantSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});

export function parseSubscriptionGrantCsv(csvText: string): {
  rows: SubscriptionGrantCsvRow[];
  errors: SubscriptionGrantCsvError[];
} {
  if (csvText.trim().length === 0) {
    return {
      rows: [],
      errors: [{ line: 1, email: '', source: '', reason: 'CSV file is empty.' }],
    };
  }

  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  const rawRows = parsed.data.map((columns, index) => ({
    columns: (columns ?? []).map((value) => (value ?? '').toString()),
    line: index + 1,
  }));

  const hasHeader =
    (rawRows[0]?.columns?.[0] ?? '').trim().toLowerCase() === 'email' &&
    (rawRows[0]?.columns?.[1] ?? '').trim().toLowerCase() === 'source';
  const dataRows = hasHeader ? rawRows.slice(1) : rawRows;

  if (dataRows.length > MAX_CSV_ROWS) {
    return {
      rows: [],
      errors: [
        {
          line: MAX_CSV_ROWS + 1,
          email: '',
          source: '',
          reason: `CSV exceeds maximum row count (${MAX_CSV_ROWS}).`,
        },
      ],
    };
  }

  const rows: SubscriptionGrantCsvRow[] = [];
  const errors: SubscriptionGrantCsvError[] = [];

  for (const row of dataRows) {
    const email = (row.columns[0] ?? '').trim().toLowerCase();
    const sourceValue = (row.columns[1] ?? '').trim().toLowerCase();
    const grantReason = (row.columns[2] ?? '').trim();

    if (!email || !sourceValue || !grantReason) {
      errors.push({
        line: row.line,
        email,
        source: sourceValue,
        reason: 'Columns email,source,reason are required.',
      });
      continue;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({
        line: row.line,
        email,
        source: sourceValue,
        reason: 'Invalid email format.',
      });
      continue;
    }

    const sourceParsed = subscriptionGrantSourceSchema.safeParse(sourceValue);
    if (!sourceParsed.success) {
      errors.push({
        line: row.line,
        email,
        source: sourceValue,
        reason: 'source must be either legacy or gift.',
      });
      continue;
    }

    if (grantReason.length < 3 || grantReason.length > 500) {
      errors.push({
        line: row.line,
        email,
        source: sourceValue,
        reason: 'reason must be between 3 and 500 characters.',
      });
      continue;
    }

    rows.push({
      line: row.line,
      email,
      source: sourceParsed.data,
      grantReason,
    });
  }

  return { rows, errors };
}
