export type ProfileAnalyticsSnapshot = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  primaryGoal: string;
  primaryChallenge: string;
};

const TRACKED_PROFILE_FIELDS = [
  ['firstName', 'first_name'],
  ['lastName', 'last_name'],
  ['phone', 'phone'],
  ['primaryGoal', 'primary_goal'],
  ['primaryChallenge', 'primary_challenge'],
] as const satisfies ReadonlyArray<readonly [keyof ProfileAnalyticsSnapshot, string]>;

function normalizeProfileValue(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

export function getProfileCompletion(snapshot: ProfileAnalyticsSnapshot): number {
  const filledFieldCount = [
    snapshot.firstName,
    snapshot.lastName,
    snapshot.email,
    snapshot.phone,
    snapshot.primaryGoal,
    snapshot.primaryChallenge,
  ].filter((value) => normalizeProfileValue(value).length > 0).length;

  return Math.round((filledFieldCount / 6) * 100);
}

export function getUpdatedProfileFields(
  previous: ProfileAnalyticsSnapshot,
  current: ProfileAnalyticsSnapshot,
): string {
  return TRACKED_PROFILE_FIELDS.filter(([fieldName]) => {
    return normalizeProfileValue(previous[fieldName]) !== normalizeProfileValue(current[fieldName]);
  })
    .map(([, analyticsFieldName]) => analyticsFieldName)
    .join(',');
}
