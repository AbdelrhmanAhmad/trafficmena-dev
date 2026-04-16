export type CompletedSignUpTrackingParams = {
  userId: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
};

type BuildCompletedSignUpTrackingParamsInput = {
  authUserId?: string | null;
  invitationUserId?: string | null;
  email: string;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export function buildCompletedSignUpTrackingParams(
  input: BuildCompletedSignUpTrackingParamsInput,
): CompletedSignUpTrackingParams | null {
  const resolvedUserId = input.authUserId ?? input.invitationUserId ?? null;
  if (!resolvedUserId) {
    return null;
  }

  return {
    userId: resolvedUserId,
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() ?? '',
    firstName: input.firstName?.trim() ?? '',
    lastName: input.lastName?.trim() ?? '',
  };
}
