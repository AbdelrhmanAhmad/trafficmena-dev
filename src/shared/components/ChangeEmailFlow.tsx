import { Loader2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  requestEmailChange,
  verifyCurrentEmailChange,
  verifyEmailChange,
} from '@/app/api/auth';
import { ApiError } from '@/app/api/client';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/custom/use-toast';

type Mode = 'view' | 'editEmail' | 'verifyCurrent' | 'verifyNew';

const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ChangeEmailFlowProps = {
  currentEmail: string;
  onChanged?: () => void;
};

export function ChangeEmailFlow({ currentEmail, onChanged }: ChangeEmailFlowProps) {
  const { t } = useTranslation('auth');
  const { toast } = useToast();
  const currentEmailId = useId();
  const newEmailId = useId();
  const otpId = useId();
  const errorId = useId();

  const [mode, setMode] = useState<Mode>('view');
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const newEmailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  const messageFor = (sendError: unknown, fallback: string) =>
    sendError instanceof ApiError || sendError instanceof Error ? sendError.message : fallback;

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  useEffect(() => {
    if (mode === 'editEmail') newEmailRef.current?.focus();
    if (mode === 'verifyCurrent' || mode === 'verifyNew') otpRef.current?.focus();
  }, [mode]);

  const resetFlow = () => {
    setMode('view');
    setNewEmail('');
    setOtp('');
    setError(null);
    setResendIn(0);
  };

  const sendInitialCode = async (email: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await requestEmailChange(email);
      setOtp('');
      setMode(result.phase === 'current_email' ? 'verifyCurrent' : 'verifyNew');
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch (sendError) {
      setError(messageFor(sendError, t('changeEmail.errors.sendFailed')));
      if (sendError instanceof ApiError && sendError.status === 429) {
        const retryAfter = Number(sendError.extra?.retryAfterSeconds);
        setResendIn(retryAfter > 0 ? retryAfter : RESEND_COOLDOWN_SECONDS);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (mode === 'verifyCurrent') {
      await sendInitialCode(newEmail.trim().toLowerCase());
      return;
    }
    if (mode === 'verifyNew') {
      setError(null);
      setIsSubmitting(true);
      try {
        const result = await requestEmailChange(newEmail.trim().toLowerCase());
        setOtp('');
        setMode(result.phase === 'new_email' ? 'verifyNew' : 'verifyCurrent');
        setResendIn(RESEND_COOLDOWN_SECONDS);
      } catch (sendError) {
        setError(messageFor(sendError, t('changeEmail.errors.resendFailed')));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError(t('changeEmail.errors.invalidEmail'));
      return;
    }
    if (trimmed === currentEmail.trim().toLowerCase()) {
      setError(t('changeEmail.errors.sameEmail'));
      return;
    }
    await sendInitialCode(trimmed);
  };

  const handleVerifyCurrent = async (event: FormEvent) => {
    event.preventDefault();
    const code = otp.trim();
    if (code.length < 4) {
      setError(t('changeEmail.errors.otpTooShortCurrent'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyCurrentEmailChange(newEmail.trim().toLowerCase(), code);
      setOtp('');
      setMode('verifyNew');
      setResendIn(RESEND_COOLDOWN_SECONDS);
      toast({
        title: t('changeEmail.toast.currentVerifiedTitle'),
        description: t('changeEmail.toast.currentVerifiedDesc'),
      });
    } catch (verifyError) {
      setError(messageFor(verifyError, t('changeEmail.errors.verifyFailed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyNew = async (event: FormEvent) => {
    event.preventDefault();
    const code = otp.trim();
    if (code.length < 4) {
      setError(t('changeEmail.errors.otpTooShortNew'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await verifyEmailChange(newEmail.trim().toLowerCase(), code);
      toast({
        title: t('changeEmail.toast.updatedTitle'),
        description: t('changeEmail.toast.updatedDesc', { email: result.email }),
      });
      resetFlow();
      onChanged?.();
    } catch (verifyError) {
      setError(messageFor(verifyError, t('changeEmail.errors.verifyFailed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorBanner = error ? (
    <p className="mt-1 text-xs text-destructive" id={errorId} aria-live="assertive">
      {error}
    </p>
  ) : null;

  if (mode === 'view') {
    return (
      <div>
        <Label htmlFor={currentEmailId}>{t('changeEmail.label')}</Label>
        <Input disabled id={currentEmailId} name="email" value={currentEmail} />
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{t('changeEmail.helper')}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              setNewEmail('');
              setMode('editEmail');
            }}
          >
            {t('changeEmail.changeButton')}
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'editEmail') {
    return (
      <form className="space-y-2" onSubmit={handleRequest}>
        <h3 className="text-sm font-medium">{t('changeEmail.step1Title')}</h3>
        <Label htmlFor={newEmailId}>{t('changeEmail.newEmailLabel')}</Label>
        <Input
          ref={newEmailRef}
          id={newEmailId}
          type="email"
          autoComplete="email"
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          placeholder={t('changeEmail.emailPlaceholder')}
        />
        {errorBanner}
        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {t('changeEmail.sendCodeCurrent')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={resetFlow}>
            {t('changeEmail.cancel')}
          </Button>
        </div>
      </form>
    );
  }

  if (mode === 'verifyCurrent') {
    return (
      <form className="space-y-2" onSubmit={handleVerifyCurrent}>
        <h3 className="text-sm font-medium">{t('changeEmail.step2Title')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('changeEmail.verifyCurrentHint', { email: currentEmail })}
        </p>
        <Label htmlFor={otpId}>{t('changeEmail.otpLabel')}</Label>
        <Input
          ref={otpRef}
          id={otpId}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          placeholder={t('changeEmail.otpPlaceholder')}
        />
        {errorBanner}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {t('changeEmail.verifyCurrent')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={resendIn > 0 || isSubmitting}
            onClick={resendCode}
          >
            {resendIn > 0 ? t('changeEmail.resendIn', { seconds: resendIn }) : t('changeEmail.resend')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={resetFlow}>
            {t('changeEmail.cancel')}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form className="space-y-2" onSubmit={handleVerifyNew}>
      <h3 className="text-sm font-medium">{t('changeEmail.step3Title')}</h3>
      <p className="text-xs text-muted-foreground">
        {t('changeEmail.verifyNewHint', { email: newEmail })}
      </p>
      <Label htmlFor={otpId}>{t('changeEmail.otpLabel')}</Label>
      <Input
        ref={otpRef}
        id={otpId}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={otp}
        onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        placeholder={t('changeEmail.otpPlaceholder')}
      />
      {errorBanner}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
          {t('changeEmail.verifyUpdate')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={resendIn > 0 || isSubmitting}
          onClick={resendCode}
        >
          {resendIn > 0 ? t('changeEmail.resendIn', { seconds: resendIn }) : t('changeEmail.resend')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={resetFlow}>
          {t('changeEmail.cancel')}
        </Button>
      </div>
    </form>
  );
}
