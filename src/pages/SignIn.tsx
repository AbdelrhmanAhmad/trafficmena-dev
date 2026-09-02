import type React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/app/api/client';
import { completeSignInVerification, requestSignInCode, sanitizeOtp } from '@/app/auth/signIn';
import { isTurnstileRequiredApiError } from '@/app/auth/turnstileOtpGate';
import { useTurnstileOtpGate } from '@/app/auth/useTurnstileOtpGate';
import { trackLogin, trackLoginStart } from '@/lib/analytics/events';
import Layout from '@/shared/components/layout/Layout';
import { Turnstile } from '@/shared/components/Turnstile';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/hooks/custom/use-toast';
import {
  captureAuthReturnFromSignInEntry,
  consumeAuthReturnPath,
} from '@/shared/utils/authReturnPath';

const SignIn: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, requestOtp, verifyOtp, refreshSession } = useAuth();
  const { toast } = useToast();
  const requestEmailId = useId();
  const verifyEmailId = useId();
  const otpId = useId();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const otpRequestInFlightRef = useRef(false);

  const clearTurnstileError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const requestLoginCodeRef = useRef<() => Promise<void>>(async () => {});

  const {
    turnstile,
    showTurnstile,
    widgetEpoch,
    handleTurnstileRequired,
    handleVerify,
    handleExpire,
    handleError,
    resetGate,
    remountWidget,
  } = useTurnstileOtpGate({
    isSubmitting,
    onAutoRetry: () => requestLoginCodeRef.current(),
    onVerified: clearTurnstileError,
  });

  const requestLoginCode = useCallback(async () => {
    if (!email.trim()) {
      setErrorMessage(t('errors.emailRequired'));
      return;
    }

    if (showTurnstile && !turnstile.isVerified) {
      setErrorMessage(t('errors.turnstileRequired'));
      return;
    }

    if (otpRequestInFlightRef.current) {
      return;
    }

    otpRequestInFlightRef.current = true;
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
        title: t('toast.checkInboxTitle'),
        description: t('toast.checkInboxDesc'),
      });
      setStep('verify');
      resetGate();
    } catch (error) {
      if (isTurnstileRequiredApiError(error)) {
        handleTurnstileRequired();
        if (error instanceof ApiError && error.code === 'TURNSTILE_FAILED') {
          remountWidget();
        }
        setErrorMessage(t('errors.turnstileBelow'));
        return;
      }
      const message = error instanceof Error ? error.message : t('errors.sendCodeFailed');
      setErrorMessage(message);
    } finally {
      otpRequestInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    email,
    handleTurnstileRequired,
    remountWidget,
    requestOtp,
    resetGate,
    showTurnstile,
    t,
    toast,
    turnstile.isVerified,
    turnstile.token,
  ]);

  requestLoginCodeRef.current = requestLoginCode;

  useEffect(() => {
    captureAuthReturnFromSignInEntry(location);
  }, [location]);

  useEffect(() => {
    if (!loading && user) {
      navigate(consumeAuthReturnPath(), { replace: true });
    }
  }, [loading, user, navigate]);

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    await requestLoginCode();
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !otp.trim()) {
      setErrorMessage(t('errors.emailAndOtpRequired'));
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
      toast({ title: t('toast.welcomeBackTitle'), description: t('toast.welcomeBackDesc') });
      navigate(consumeAuthReturnPath(), { replace: true });
    } catch (error) {
      trackLogin({ status: 'failure', email: email.trim().toLowerCase() });
      const message = error instanceof Error ? error.message : t('errors.invalidOtp');
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
                {t('badge')}
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-neutral-900">
                {t('welcomeBack')}
              </h2>
              <p className="mt-2 text-sm text-neutral-600">{t('welcomeSubtitle')}</p>
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
                    {t('emailAddress')}
                  </Label>
                  <Input
                    id={requestEmailId}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t('emailPlaceholder')}
                    className="mt-1 rounded-xl border-neutral-200"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {showTurnstile && (
                  <div className="flex justify-center">
                    <Turnstile
                      key={widgetEpoch}
                      onVerify={handleVerify}
                      onExpire={handleExpire}
                      onError={handleError}
                      theme="light"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || (showTurnstile && !turnstile.isVerified)}
                  className="w-full rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] py-3 font-semibold text-[#101010] shadow hover:brightness-95"
                >
                  {isSubmitting ? t('sendingCode') : t('sendLoginCode')}
                </Button>

                <p className="text-center text-sm text-neutral-600">
                  {t('noAccount')}{' '}
                  <Link to="/signup" className="font-medium text-[#05ef62] hover:text-[#29cf9f]">
                    {t('joinTrafficMena')}
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <Label htmlFor={verifyEmailId} className="text-sm font-medium text-neutral-700">
                    {t('emailAddress')}
                  </Label>
                  <Input
                    id={verifyEmailId}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t('emailPlaceholder')}
                    className="mt-1 rounded-xl border-neutral-200"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor={otpId} className="text-sm font-medium text-neutral-700">
                    {t('otpLabel')}
                  </Label>
                  <Input
                    id={otpId}
                    value={otp}
                    onChange={(event) => setOtp(sanitizeOtp(event.target.value))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder={t('otpPlaceholder')}
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
                  {isSubmitting ? t('verifying') : t('verifyAndSignIn')}
                </Button>

                <div className="text-center text-sm text-neutral-600">
                  {t('didntGetCode')}{' '}
                  <button
                    type="button"
                    className="font-medium text-[#05ef62] hover:text-[#29cf9f]"
                    onClick={requestLoginCode}
                    disabled={isSubmitting}
                  >
                    {t('resendCode')}
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
