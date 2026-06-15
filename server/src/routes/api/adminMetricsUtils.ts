export const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

export const getActiveSubscriptionMetricsFromAggregate = (
  row: { premiumUsers: number | string | null; revenueCents: number | string | null } | null,
) => {
  const premiumUsers = toNumber(row?.premiumUsers);
  const revenueCents = toNumber(row?.revenueCents);

  return {
    premiumUsers,
    activeSubscriptions: premiumUsers,
    revenueCents,
  };
};
