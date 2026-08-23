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

// Strip everything except digits and cap at the 6-digit code length, so a pasted/typed code with
// spaces or stray characters (e.g. "4 4 5 4 6 3") still matches. .trim() alone left internal spaces.
export function sanitizeOtp(value: string): string {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 6);
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
    otp: sanitizeOtp(params.otp),
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
