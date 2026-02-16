export type ActiveSubscriptionRow = {
  userId: string;
  pricePaidCents: number | null;
  source: 'paid' | 'legacy' | 'gift';
};

export type ActiveSubscriptionAggregateRow = {
  premiumUsers: number | string | null;
  revenueCents: number | string | null;
} | null;

export const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

export const getActiveSubscriptionMetrics = (rows: ActiveSubscriptionRow[]) => {
  const uniqueUsers = new Set(rows.map((row) => row.userId)).size;
  const revenueCents = rows.reduce(
    (total, row) => total + (row.source === 'paid' ? (row.pricePaidCents ?? 0) : 0),
    0,
  );

  return {
    premiumUsers: uniqueUsers,
    activeSubscriptions: uniqueUsers,
    revenueCents,
  };
};

export const getActiveSubscriptionMetricsFromAggregate = (row: ActiveSubscriptionAggregateRow) => {
  const premiumUsers = toNumber(row?.premiumUsers);
  const revenueCents = toNumber(row?.revenueCents);

  return {
    premiumUsers,
    activeSubscriptions: premiumUsers,
    revenueCents,
  };
};
