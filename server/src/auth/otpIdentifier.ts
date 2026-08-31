/** Matches Better Auth `toOTPIdentifier(type, email)` in email-otp plugin. */
export type OtpVerificationType = 'sign-in' | 'email-verification' | 'forget-password';

export function buildOtpVerificationIdentifier(type: OtpVerificationType, email: string): string {
  return `${type}-otp-${email}`;
}
