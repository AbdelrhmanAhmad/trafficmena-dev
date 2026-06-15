import Papa from 'papaparse';
import { z } from 'zod';
import { MAX_CSV_ROWS } from './utils.js';

const uuidSchema = z.string().uuid();

export type SeriesGrantCsvRow = {
  line: number;
  email: string;
  seriesId: string;
  grantReason: string;
};

export type SeriesGrantCsvError = {
  line: number;
  email: string;
  seriesId: string;
  reason: string;
};

export function parseSeriesGrantCsv(csvText: string): {
  rows: SeriesGrantCsvRow[];
  errors: SeriesGrantCsvError[];
} {
  if (csvText.trim().length === 0) {
    return {
      rows: [],
      errors: [{ line: 1, email: '', seriesId: '', reason: 'CSV file is empty.' }],
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
    (rawRows[0]?.columns?.[1] ?? '').trim().toLowerCase() === 'series_id';
  const dataRows = hasHeader ? rawRows.slice(1) : rawRows;

  if (dataRows.length > MAX_CSV_ROWS) {
    return {
      rows: [],
      errors: [
        {
          line: MAX_CSV_ROWS + 1,
          email: '',
          seriesId: '',
          reason: `CSV exceeds maximum row count (${MAX_CSV_ROWS}).`,
        },
      ],
    };
  }

  const rows: SeriesGrantCsvRow[] = [];
  const errors: SeriesGrantCsvError[] = [];

  for (const row of dataRows) {
    const email = (row.columns[0] ?? '').trim().toLowerCase();
    const seriesId = (row.columns[1] ?? '').trim();
    const grantReason = (row.columns[2] ?? '').trim();

    if (!email || !seriesId || !grantReason) {
      errors.push({
        line: row.line,
        email,
        seriesId,
        reason: 'Columns email,series_id,reason are required.',
      });
      continue;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({
        line: row.line,
        email,
        seriesId,
        reason: 'Invalid email format.',
      });
      continue;
    }

    if (!uuidSchema.safeParse(seriesId).success) {
      errors.push({
        line: row.line,
        email,
        seriesId,
        reason: 'series_id must be a valid UUID.',
      });
      continue;
    }

    if (grantReason.length < 3 || grantReason.length > 500) {
      errors.push({
        line: row.line,
        email,
        seriesId,
        reason: 'reason must be between 3 and 500 characters.',
      });
      continue;
    }

    rows.push({ line: row.line, email, seriesId, grantReason });
  }

  return { rows, errors };
}
