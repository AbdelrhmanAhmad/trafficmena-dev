import { Loader2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackSignUpStep } from '@/lib/analytics/events';
import SignUpLayout, { useSignUpContext } from '@/shared/components/layout/SignUpLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

const ACCEPTANCE_CACHE_KEY = 'trafficmena:invitation-acceptance';

type CachedAcceptance = {
  token: string;
  invitationId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  userId?: string;
};

const Step2: React.FC = () => {
  const navigate = useNavigate();
  const { formData, updateFormData, setCurrentStep: setSignUpCurrentStep } = useSignUpContext();
  const [email, setEmail] = useState(formData.email);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const emailId = useId();

  useEffect(() => {
    setSignUpCurrentStep(2);
  }, [setSignUpCurrentStep]);

  const cachedAcceptance = useMemo<CachedAcceptance | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(ACCEPTANCE_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as CachedAcceptance;
    } catch (storageError) {
      console.warn('[signup] invalid invitation cache payload', storageError);
      return null;
    }
  }, []);

  const invitationToken = formData.invitationToken ?? cachedAcceptance?.token;
  const invitationUserId = formData.invitationUserId ?? cachedAcceptance?.userId ?? undefined;
  const canonicalInvitationEmail =
    invitationToken && (cachedAcceptance?.email ?? formData.email)
      ? (cachedAcceptance?.email ?? formData.email).toLowerCase()
      : null;
  const isInvitationFlow = Boolean(invitationToken && invitationUserId);

  useEffect(() => {
    if (!isInvitationFlow || !canonicalInvitationEmail) return;
    if (canonicalInvitationEmail !== email) {
      setEmail(canonicalInvitationEmail);
    }
  }, [canonicalInvitationEmail, email, isInvitationFlow]);

  useEffect(() => {
    if (isInvitationFlow) {
      setError(null);
      setApiError(null);
    }
  }, [isInvitationFlow]);

  const validateEmail = (value: string) => {
    if (!value.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return null;
  };

  const handleNext = async () => {
    setError(null);
    setApiError(null);

    if (isInvitationFlow) {
      const normalized = canonicalInvitationEmail ?? email.trim().toLowerCase();

      if (!normalized) {
        setError('Email is required');
        return;
      }

      updateFormData({
        email: normalized,
        invitationToken: invitationToken ?? undefined,
        invitationUserId,
      });
      trackSignUpStep(2, 'email_entered');
      navigate('/signup/step-3');
      return;
    }

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setApiError(null);

    const normalized = email.trim().toLowerCase();

    updateFormData({ email: normalized });
    trackSignUpStep(2, 'email_entered');
    navigate('/signup/step-3');
    setIsLoading(false);
    return;
  };

  const handleBack = () => {
    navigate('/signup/step-1');
  };

  return (
    <SignUpLayout currentStep={2} onBack={handleBack}>
      <div className="space-y-6">
        <div className="mb-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Step 2
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">
            How can we reach you?
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            We&apos;ll send important updates and login codes to this email address.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor={emailId} className="text-sm font-medium text-neutral-700">
              Email Address *
            </Label>
            <Input
              id={emailId}
              type="email"
              value={email}
              onChange={(event) => {
                if (isInvitationFlow) return;
                setEmail(event.target.value);
                if (error) setError(null);
                if (apiError) setApiError(null);
              }}
              placeholder="Enter your email"
              autoComplete="email"
              readOnly={isInvitationFlow}
              disabled={isInvitationFlow}
              className={`mt-1 rounded-xl border-neutral-200 ${
                error || apiError ? 'border-red-500' : ''
              }`}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            {apiError && !error && <p className="mt-1 text-sm text-red-500">{apiError}</p>}
            {isInvitationFlow && !error && (
              <p className="mt-1 text-xs text-neutral-500">
                This email comes from your invitation and can&apos;t be changed.
              </p>
            )}
          </div>

          <Button
            onClick={handleNext}
            disabled={isLoading}
            className="w-full rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] py-3 font-semibold text-[#101010] shadow hover:brightness-95"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </div>
    </SignUpLayout>
  );
};

export default Step2;
