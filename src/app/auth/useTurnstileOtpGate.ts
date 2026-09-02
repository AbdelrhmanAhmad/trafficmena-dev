import { useCallback, useEffect, useRef, useState } from 'react';
import { useTurnstile } from '@/shared/components/Turnstile';
import { shouldAutoRetryTurnstileOtpRequest } from './turnstileOtpGate';

type UseTurnstileOtpGateOptions = {
  isSubmitting: boolean;
  onAutoRetry: () => void | Promise<void>;
  onVerified?: () => void;
};

/**
 * Shared Turnstile gate for OTP request flows (sign-in, signup resend).
 * After TURNSTILE_REQUIRED, completes captcha → auto-retries the OTP request.
 */
export function useTurnstileOtpGate({
  isSubmitting,
  onAutoRetry,
  onVerified,
}: UseTurnstileOtpGateOptions) {
  const turnstile = useTurnstile();
  const [showTurnstile, setShowTurnstile] = useState(false);
  const [widgetEpoch, setWidgetEpoch] = useState(0);
  const awaitingAutoRetryRef = useRef(false);
  const onAutoRetryRef = useRef(onAutoRetry);

  onAutoRetryRef.current = onAutoRetry;

  const handleTurnstileRequired = useCallback(() => {
    awaitingAutoRetryRef.current = true;
    setShowTurnstile(true);
  }, []);

  const handleVerify = useCallback(
    (token: string) => {
      turnstile.handleVerify(token);
      onVerified?.();
    },
    [turnstile, onVerified],
  );

  const resetGate = useCallback(() => {
    awaitingAutoRetryRef.current = false;
    setShowTurnstile(false);
    turnstile.reset();
  }, [turnstile]);

  const remountWidget = useCallback(() => {
    turnstile.reset();
    setWidgetEpoch((epoch) => epoch + 1);
  }, [turnstile]);

  useEffect(() => {
    if (
      !shouldAutoRetryTurnstileOtpRequest({
        awaitingAutoRetry: awaitingAutoRetryRef.current,
        showTurnstile,
        isVerified: turnstile.isVerified,
        hasToken: Boolean(turnstile.token),
        isSubmitting,
      })
    ) {
      return;
    }

    awaitingAutoRetryRef.current = false;
    void onAutoRetryRef.current();
  }, [showTurnstile, turnstile.isVerified, turnstile.token, isSubmitting]);

  return {
    turnstile,
    showTurnstile,
    widgetEpoch,
    handleTurnstileRequired,
    handleVerify,
    handleExpire: turnstile.handleExpire,
    handleError: turnstile.handleError,
    resetGate,
    remountWidget,
  };
}
