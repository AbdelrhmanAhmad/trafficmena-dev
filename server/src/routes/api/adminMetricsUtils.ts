export type ActiveSubscriptionRow = {
  userId: string;
  pricePaidCents: number | null;
};

export const getActiveSubscriptionMetrics = (rows: ActiveSubscriptionRow[]) => {
  const uniqueUsers = new Set(rows.map((row) => row.userId)).size;
  const revenueCents = rows.reduce((total, row) => total + (row.pricePaidCents ?? 0), 0);

  return {
    premiumUsers: uniqueUsers,
    activeSubscriptions: uniqueUsers,
    revenueCents,
  };
};
