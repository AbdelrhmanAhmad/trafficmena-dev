import { Loader2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { requestEmailChange, verifyEmailChange } from '@/app/api/auth';
import { ApiError } from '@/app/api/client';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/custom/use-toast';

type Mode = 'view' | 'editEmail' | 'verify';

const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ChangeEmailFlowProps = {
  currentEmail: string;
  onChanged?: () => void;
};

const messageFor = (error: unknown, fallback: string) =>
  error instanceof ApiError || error instanceof Error ? error.message : fallback;

export function ChangeEmailFlow({ currentEmail, onChanged }: ChangeEmailFlowProps) {
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

  // Resend cooldown countdown (matches the backend short-window rate limit).
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  // Move focus to the active step's input so keyboard users land in the right place.
  useEffect(() => {
    if (mode === 'editEmail') newEmailRef.current?.focus();
    if (mode === 'verify') otpRef.current?.focus();
  }, [mode]);

  const resetFlow = () => {
    setMode('view');
    setNewEmail('');
    setOtp('');
    setError(null);
    setResendIn(0);
  };

  const sendCode = async (email: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await requestEmailChange(email);
      setOtp('');
      setMode('verify');
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch (sendError) {
      setError(messageFor(sendError, 'Unable to send the verification code. Please try again.'));
      // Align the resend countdown with the server's actual window so we don't invite a retry that
      // just 429s again (C-8). The server returns retryAfterSeconds on a rate-limit response.
      if (sendError instanceof ApiError && sendError.status === 429) {
        const retryAfter = Number(sendError.extra?.retryAfterSeconds);
        setResendIn(retryAfter > 0 ? retryAfter : RESEND_COOLDOWN_SECONDS);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    if (trimmed === currentEmail.trim().toLowerCase()) {
      setError('That is already your email address.');
      return;
    }
    await sendCode(trimmed);
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    const code = otp.trim();
    if (code.length < 4) {
      setError('Enter the 6-digit code sent to your new email.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await verifyEmailChange(newEmail.trim().toLowerCase(), code);
      toast({ title: 'Email updated', description: `Your email is now ${result.email}.` });
      resetFlow();
      onChanged?.();
    } catch (verifyError) {
      setError(messageFor(verifyError, 'That code is incorrect or has expired.'));
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
        <Label htmlFor={currentEmailId}>Email</Label>
        <Input disabled id={currentEmailId} name="email" value={currentEmail} />
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Changing your email requires a verification code sent to the new address.
          </p>
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
            Change email
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'editEmail') {
    return (
      <form className="space-y-2" onSubmit={handleRequest}>
        <h3 className="text-sm font-medium">Change email — step 1 of 2</h3>
        <Label htmlFor={newEmailId}>New email address</Label>
        <Input
          ref={newEmailRef}
          id={newEmailId}
          type="email"
          autoComplete="email"
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          placeholder="you@example.com"
        />
        {errorBanner}
        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send code
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={resetFlow}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form className="space-y-2" onSubmit={handleVerify}>
      <h3 className="text-sm font-medium">Change email — step 2 of 2</h3>
      <p className="text-xs text-muted-foreground">
        Enter the 6-digit code sent to <span className="font-medium">{newEmail}</span>.
      </p>
      <Label htmlFor={otpId}>Verification code</Label>
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
        placeholder="123456"
      />
      {errorBanner}
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Verify & update
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={resendIn > 0 || isSubmitting}
          onClick={() => sendCode(newEmail.trim().toLowerCase())}
        >
          {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={resetFlow}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
