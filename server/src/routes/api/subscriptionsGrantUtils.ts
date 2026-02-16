export type SubscriptionGrantSource = 'legacy' | 'gift';

export type SubscriptionGrantCsvRow = {
  line: number;
  email: string;
  source: SubscriptionGrantSource;
  grantReason: string;
};

export type SubscriptionGrantCsvError = {
  line: number;
  email: string;
  source: string;
  reason: string;
};

export type NormalizedSubscriptionGrantRow = {
  line: number;
  userId: string;
  source: SubscriptionGrantSource;
  grantReason: string;
  email: string;
};

export function normalizeBulkSubscriptionGrantRows(params: {
  rows: SubscriptionGrantCsvRow[];
  userIdByEmail: Map<string, string>;
}): {
  rows: NormalizedSubscriptionGrantRow[];
  errors: SubscriptionGrantCsvError[];
} {
  if (params.rows.length === 0) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          email: '',
          source: '',
          reason: 'CSV contains no valid rows. No subscriptions were granted.',
        },
      ],
    };
  }

  const normalizedRows: NormalizedSubscriptionGrantRow[] = [];
  const errors: SubscriptionGrantCsvError[] = [];

  for (const row of params.rows) {
    const userId = params.userIdByEmail.get(row.email);
    if (!userId) {
      errors.push({
        line: row.line,
        email: row.email,
        source: row.source,
        reason: 'User email not found.',
      });
      continue;
    }

    normalizedRows.push({ ...row, userId });
  }

  if (errors.length > 0) {
    return { rows: [], errors };
  }

  const dedupedByUserId = new Map<string, NormalizedSubscriptionGrantRow>();
  for (const row of normalizedRows) {
    if (!dedupedByUserId.has(row.userId)) {
      dedupedByUserId.set(row.userId, row);
    }
  }
  const dedupedRows = Array.from(dedupedByUserId.values());

  return {
    rows: dedupedRows,
    errors: [],
  };
}

export function collectActiveSubscriptionConflicts(params: {
  rows: NormalizedSubscriptionGrantRow[];
  activeEndsAtByUserId: Map<string, Date>;
}): SubscriptionGrantCsvError[] {
  const errors: SubscriptionGrantCsvError[] = [];

  for (const row of params.rows) {
    const activeEndsAt = params.activeEndsAtByUserId.get(row.userId);
    if (!activeEndsAt) {
      continue;
    }

    errors.push({
      line: row.line,
      email: row.email,
      source: row.source,
      reason: `Active subscription exists until ${activeEndsAt.toISOString()}.`,
    });
  }

  return errors;
}
