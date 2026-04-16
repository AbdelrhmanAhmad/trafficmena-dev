import { Mail } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/app/api/client';
import { trackSignUp, trackSignUpStep } from '@/lib/analytics/events';
import { buildCompletedSignUpTrackingParams } from '@/lib/analytics/signup';
import SignUpLayout, {
  SIGNUP_OTP_STEP,
  SIGNUP_TOTAL_STEPS,
  useSignUpContext,
} from '@/shared/components/layout/SignUpLayout';
import { Turnstile, useTurnstile } from '@/shared/components/Turnstile';
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
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';
  const { verifyOtp, requestOtp, user } = useAuth();
  const { formData } = useSignUpContext();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const turnstile = useTurnstile();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showTurnstile, setShowTurnstile] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/signup/step-2');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, user]);

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      return;
    }

    if (code.trim().length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Enter the 6-digit code we emailed you.',
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
        title: 'Welcome to TrafficMENA',
        description: 'You are now signed in.',
      });
      // Use centralized redirect logic (subscription > event > dashboard)
      const redirectUrl = getPostSignupRedirectUrl();
      navigate(redirectUrl);
    } catch (error) {
      const appError = handleError(error);
      toast({
        title: 'Code verification failed',
        description: appError.message || 'Please try again with a fresh code.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      return;
    }

    // If Turnstile is shown but not verified, block
    if (showTurnstile && !turnstile.isVerified) {
      toast({
        title: 'Security check required',
        description: 'Please complete the security check below.',
        variant: 'destructive',
      });
      return;
    }

    setIsResending(true);
    try {
      await requestOtp(email, 'signup', {
        turnstileToken: turnstile.token ?? undefined,
      });
      toast({
        title: 'New code sent',
        description: 'Check your inbox. Codes expire in 10 minutes.',
      });
      setShowTurnstile(false);
      turnstile.reset();
    } catch (error) {
      // Handle Turnstile requirement
      if (error instanceof ApiError && error.extra?.requiresTurnstile) {
        setShowTurnstile(true);
        toast({
          title: 'Security check required',
          description: 'Please complete the security check below and try again.',
          variant: 'destructive',
        });
        setIsResending(false);
        return;
      }
      const appError = handleError(error);
      toast({
        title: 'Unable to resend code',
        description: appError.message || 'Wait a moment before trying again.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

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
          <h2 className="text-2xl font-bold text-primary">Check your email</h2>
          <p className="text-gray-600">
            We sent a login code to <span className="font-medium text-primary">{email}</span>
          </p>
          <p className="text-sm text-gray-500">
            Enter the 6-digit code to finish setting up your account. Codes expire in 10 minutes,
            and you can request a new one if needed.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            containerClassName="justify-center"
            aria-label="One-time password"
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
            {isVerifying ? 'Verifying…' : 'Verify and continue'}
          </Button>
        </form>

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

        <div className="space-y-4 text-sm text-gray-600">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || (showTurnstile && !turnstile.isVerified)}
            className="w-full text-primary transition hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
          >
            {isResending ? 'Sending new code…' : 'Request new code'}
          </button>

          <Button onClick={() => navigate('/signup/step-2')} variant="outline" className="w-full">
            Back to Login Options
          </Button>

          <Button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-primary-green to-primary-gradient text-white hover:from-primary-gradient hover:to-secondary-teal"
          >
            Return to Home
          </Button>
        </div>
      </div>
    </SignUpLayout>
  );
};

export default CheckEmail;
