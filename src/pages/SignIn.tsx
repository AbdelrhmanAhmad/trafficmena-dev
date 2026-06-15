import type React from 'react';
import { useEffect, useId, useState } from 'react';
import { Link, type Location, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/app/api/client';
import { completeSignInVerification, requestSignInCode } from '@/app/auth/signIn';
import { trackLogin, trackLoginStart } from '@/lib/analytics/events';
import Layout from '@/shared/components/layout/Layout';
import { Turnstile, useTurnstile } from '@/shared/components/Turnstile';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/hooks/custom/use-toast';

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, requestOtp, verifyOtp, refreshSession } = useAuth();
  const { toast } = useToast();
  const turnstile = useTurnstile();
  const requestEmailId = useId();
  const verifyEmailId = useId();
  const otpId = useId();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTurnstile, setShowTurnstile] = useState(false);
  const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';

  useEffect(() => {
    if (!loading && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, user, navigate, redirectTo]);

  const requestLoginCode = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    // If Turnstile is shown but not verified, block submission
    if (showTurnstile && !turnstile.isVerified) {
      setErrorMessage('Please complete the security check.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await requestSignInCode({
        email,
        requestOtp,
        onLoginStart: trackLoginStart,
        turnstileToken: turnstile.token ?? undefined,
      });
      toast({
        title: 'Check your inbox',
        description: 'We sent you a 6-digit code to sign in.',
      });
      setStep('verify');
      setShowTurnstile(false);
      turnstile.reset();
    } catch (error) {
      // Handle Turnstile requirement
      if (error instanceof ApiError && error.extra?.requiresTurnstile) {
        setShowTurnstile(true);
        setErrorMessage('Please complete the security check below.');
        return;
      }
      const message = error instanceof Error ? error.message : 'Unable to send login code.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    await requestLoginCode();
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !otp.trim()) {
      setErrorMessage('Enter your email and the code you received.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { normalizedEmail, userId } = await completeSignInVerification({
        email,
        otp,
        verifyOtp,
        refreshSession,
        onRefreshError: (error) => {
          console.warn('[auth] refreshSession failed after successful OTP verification', error);
        },
      });
      trackLogin({ status: 'success', email: normalizedEmail, userId });
      toast({ title: 'Welcome back!', description: 'You are now signed in.' });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      trackLogin({ status: 'failure', email: email.trim().toLowerCase() });
      const message = error instanceof Error ? error.message : 'Invalid or expired code.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="relative isolate min-h-screen overflow-hidden px-4 py-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-[45vw] top-[-30vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/60 via-[#f4fff9]/40 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -right-[48vw] bottom-[-35vh] -z-10 h-[60vh] w-[82vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[90px]" />

        <div className="relative mx-auto flex w-full max-w-[420px] flex-col gap-6">
          <div className="rounded-[28px] border border-neutral-200 bg-white/95 p-8 shadow-[0_18px_50px_-20px_rgba(16,16,16,0.35)] backdrop-blur">
            <div className="mb-8 text-center">
              <span className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600">
                TrafficMENA Account
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-neutral-900">
                Welcome Back
              </h2>
              <p className="mt-2 text-sm text-neutral-600">
                Sign in to continue exploring events, content, and the community.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            {step === 'request' ? (
              <form onSubmit={handleRequestOtp} className="space-y-6">
                <div>
                  <Label htmlFor={requestEmailId} className="text-sm font-medium text-neutral-700">
                    Email Address
                  </Label>
                  <Input
                    id={requestEmailId}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email address"
                    className="mt-1 rounded-xl border-neutral-200"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {showTurnstile && (
                  <div className="flex justify-center">
                    <Turnstile
                      onVerify={turnstile.handleVerify}
                      onExpire={turnstile.handleExpire}
                      onError={turnstile.handleError}
                      theme="light"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || (showTurnstile && !turnstile.isVerified)}
                  className="w-full rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] py-3 font-semibold text-[#101010] shadow hover:brightness-95"
                >
                  {isSubmitting ? 'Sending code…' : 'Send login code'}
                </Button>

                <p className="text-center text-sm text-neutral-600">
                  Don&apos;t have an account?{' '}
                  <Link to="/signup" className="font-medium text-[#05ef62] hover:text-[#29cf9f]">
                    Join TrafficMENA
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <Label htmlFor={verifyEmailId} className="text-sm font-medium text-neutral-700">
                    Email Address
                  </Label>
                  <Input
                    id={verifyEmailId}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email address"
                    className="mt-1 rounded-xl border-neutral-200"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor={otpId} className="text-sm font-medium text-neutral-700">
                    6-digit Code
                  </Label>
                  <Input
                    id={otpId}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="Enter the code you received"
                    className="mt-1 rounded-xl border-neutral-200 tracking-[0.3em] text-center text-lg"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || otp.trim().length === 0}
                  className="w-full rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] py-3 font-semibold text-[#101010] shadow hover:brightness-95"
                >
                  {isSubmitting ? 'Verifying…' : 'Verify and sign in'}
                </Button>

                <div className="text-center text-sm text-neutral-600">
                  Didn&apos;t get the code?{' '}
                  <button
                    type="button"
                    className="font-medium text-[#05ef62] hover:text-[#29cf9f]"
                    onClick={requestLoginCode}
                    disabled={isSubmitting}
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SignIn;
