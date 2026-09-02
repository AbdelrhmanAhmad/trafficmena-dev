import { Mail } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/app/api/client';
import { isTurnstileRequiredApiError } from '@/app/auth/turnstileOtpGate';
import { useTurnstileOtpGate } from '@/app/auth/useTurnstileOtpGate';
import { trackSignUp, trackSignUpStep } from '@/lib/analytics/events';
import { buildCompletedSignUpTrackingParams } from '@/lib/analytics/signup';
import SignUpLayout, {
  SIGNUP_OTP_STEP,
  SIGNUP_TOTAL_STEPS,
  useSignUpContext,
} from '@/shared/components/layout/SignUpLayout';
import { Turnstile } from '@/shared/components/Turnstile';
import { Button } from '@/shared/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/shared/components/ui/input-otp';
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useErrorHandler } from '@/shared/utils/errorHandling';
import { getPostSignupRedirectUrl } from '@/shared/utils/postSignupRedirect';
import { persistSignupProfile } from './persistProfile';

const CheckEmail: React.FC = () => {
  const { t } = useTranslation('auth');
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';
  const { verifyOtp, requestOtp, user } = useAuth();
  const { formData } = useSignUpContext();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const otpRequestInFlightRef = useRef(false);
  const handleResendRef = useRef<() => Promise<void>>(async () => {});

  const {
    turnstile,
    showTurnstile,
    widgetEpoch,
    handleTurnstileRequired,
    handleVerify: handleTurnstileVerify,
    handleExpire,
    handleError: handleTurnstileWidgetError,
    resetGate,
    remountWidget,
  } = useTurnstileOtpGate({
    isSubmitting: isResending,
    onAutoRetry: () => handleResendRef.current(),
  });

  useEffect(() => {
    if (!email) {
      navigate('/signup/step-2');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (user) {
      navigate(getPostSignupRedirectUrl(), { replace: true });
    }
  }, [navigate, user]);

  const handleVerifyOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      return;
    }

    if (code.trim().length !== 6) {
      toast({
        title: t('signup.toast.invalidCodeTitle'),
        description: t('signup.toast.invalidCodeDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const signedUpUser = await verifyOtp({ email, otp: code.trim(), intent: 'signup' });
      trackSignUpStep(3, 'otp_verified');
      await persistSignupProfile();
      const trackingParams = buildCompletedSignUpTrackingParams({
        authUserId: signedUpUser?.id,
        email,
        phone: formData.phoneNumber,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      if (trackingParams) {
        trackSignUp(trackingParams);
      } else {
        console.warn('[analytics] skipped sign_up because no user id was available');
      }
      toast({
        title: t('signup.toast.welcomeTitle'),
        description: t('signup.toast.welcomeDesc'),
      });
      const redirectUrl = getPostSignupRedirectUrl();
      navigate(redirectUrl);
    } catch (error) {
      const appError = handleError(error);
      toast({
        title: t('signup.toast.verificationFailedTitle'),
        description: appError.message || t('signup.toast.verificationFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (!email) {
      return;
    }

    if (showTurnstile && !turnstile.isVerified) {
      toast({
        title: t('signup.toast.securityRequiredTitle'),
        description: t('signup.toast.securityRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (otpRequestInFlightRef.current) {
      return;
    }

    otpRequestInFlightRef.current = true;
    setIsResending(true);
    try {
      await requestOtp(email, 'signup', {
        turnstileToken: turnstile.token ?? undefined,
      });
      toast({
        title: t('signup.toast.newCodeSentTitle'),
        description: t('signup.toast.newCodeSentDesc'),
      });
      resetGate();
    } catch (error) {
      if (isTurnstileRequiredApiError(error)) {
        handleTurnstileRequired();
        if (error instanceof ApiError && error.code === 'TURNSTILE_FAILED') {
          remountWidget();
        }
        toast({
          title: t('signup.toast.securityRequiredTitle'),
          description: t('signup.toast.securityRequiredRetryDesc'),
          variant: 'destructive',
        });
        return;
      }
      const appError = handleError(error);
      toast({
        title: t('signup.toast.unableToResendTitle'),
        description: appError.message || t('signup.toast.unableToResendDesc'),
        variant: 'destructive',
      });
    } finally {
      otpRequestInFlightRef.current = false;
      setIsResending(false);
    }
  }, [
    email,
    handleError,
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

  handleResendRef.current = handleResend;

  return (
    <SignUpLayout
      currentStep={SIGNUP_OTP_STEP}
      totalSteps={SIGNUP_TOTAL_STEPS}
      showBackButton={false}
    >
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-green/10">
          <Mail className="h-8 w-8 text-primary-green" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-primary">{t('signup.checkEmail.title')}</h2>
          <p className="text-gray-600">
            {t('signup.checkEmail.sentTo')}{' '}
            <span className="font-medium text-primary">{email}</span>
          </p>
          <p className="text-sm text-gray-500">{t('signup.checkEmail.instructions')}</p>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            containerClassName="justify-center"
            aria-label={t('signup.checkEmail.otpAriaLabel')}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <Button
            type="submit"
            disabled={isVerifying || code.trim().length !== 6}
            className="w-full bg-gradient-to-r from-primary-green to-primary-gradient text-white hover:from-primary-gradient hover:to-secondary-teal"
          >
            {isVerifying ? t('verifying') : t('signup.checkEmail.verifyAndContinue')}
          </Button>
        </form>

        {showTurnstile && (
          <div className="flex justify-center">
            <Turnstile
              key={widgetEpoch}
              onVerify={handleTurnstileVerify}
              onExpire={handleExpire}
              onError={handleTurnstileWidgetError}
              theme="light"
            />
          </div>
        )}

        <div className="space-y-4 text-sm text-gray-600">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || (showTurnstile && !turnstile.isVerified)}
            className="w-full text-primary transition hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
          >
            {isResending ? t('signup.checkEmail.sendingNewCode') : t('signup.checkEmail.requestNewCode')}
          </button>

          <Button onClick={() => navigate('/signup/step-2')} variant="outline" className="w-full">
            {t('signup.checkEmail.backToLoginOptions')}
          </Button>

          <Button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-primary-green to-primary-gradient text-white hover:from-primary-gradient hover:to-secondary-teal"
          >
            {t('signup.checkEmail.returnToHome')}
          </Button>
        </div>
      </div>
    </SignUpLayout>
  );
};

export default CheckEmail;
