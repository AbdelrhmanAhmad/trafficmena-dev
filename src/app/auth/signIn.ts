import type { AuthUser, OtpIntent } from './AuthContext';

type RequestOtpOptions = {
  turnstileToken?: string;
};

type RequestOtpFn = (
  email: string,
  intent?: OtpIntent,
  options?: RequestOtpOptions,
) => Promise<void>;

type VerifyOtpFn = (params: {
  email: string;
  otp: string;
  intent?: OtpIntent;
}) => Promise<AuthUser | null>;

type RefreshSessionFn = () => Promise<AuthUser | null>;

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function requestSignInCode(params: {
  email: string;
  requestOtp: RequestOtpFn;
  onLoginStart: () => void;
  turnstileToken?: string;
}): Promise<string> {
  const normalizedEmail = normalizeAuthEmail(params.email);
  params.onLoginStart();
  await params.requestOtp(normalizedEmail, 'signin', {
    turnstileToken: params.turnstileToken,
  });
  return normalizedEmail;
}

export async function completeSignInVerification(params: {
  email: string;
  otp: string;
  verifyOtp: VerifyOtpFn;
  refreshSession: RefreshSessionFn;
  onRefreshError?: (error: unknown) => void;
}): Promise<{ normalizedEmail: string; userId: string }> {
  const normalizedEmail = normalizeAuthEmail(params.email);
  const verifiedUser = await params.verifyOtp({
    email: normalizedEmail,
    otp: params.otp.trim(),
    intent: 'signin',
  });

  try {
    const refreshedUser = await params.refreshSession();
    return {
      normalizedEmail,
      userId: refreshedUser?.id ?? verifiedUser?.id ?? '',
    };
  } catch (error) {
    params.onRefreshError?.(error);
    return {
      normalizedEmail,
      userId: verifiedUser?.id ?? '',
    };
  }
}
