import type React from 'react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/app/api/client';
import { activateInvitation } from '@/app/api/invitations';
import { trackSignUpStep } from '@/lib/analytics/events';
import SignUpLayout, { useSignUpContext } from '@/shared/components/layout/SignUpLayout';
import { Turnstile, useTurnstile } from '@/shared/components/Turnstile';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useErrorHandler } from '@/shared/utils/errorHandling';

const CHALLENGE_KEYS = ['leads', 'roi', 'proveValue', 'trends', 'team'] as const;

const Step5: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const { requestOtp } = useAuth();
  const turnstile = useTurnstile();
  const { formData, updateFormData } = useSignUpContext();
  const [primaryChallenge, setPrimaryChallenge] = useState(formData.primaryChallenge);
  const [isSending, setIsSending] = useState(false);
  const [showTurnstile, setShowTurnstile] = useState(false);
  const challengeGroupId = useId();

  const handleComplete = async () => {
    if (!formData.email) {
      toast({
        title: t('signup.toast.missingEmailTitle'),
        description: t('signup.toast.missingEmailDesc'),
        variant: 'destructive',
      });
      navigate('/signup/step-2');
      return;
    }

    // If Turnstile is shown but not verified, block submission
    if (showTurnstile && !turnstile.isVerified) {
      toast({
        title: t('signup.toast.securityRequiredTitle'),
        description: t('signup.toast.securityRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      updateFormData({ primaryChallenge });
      trackSignUpStep(6, 'challenge_selected');

      if (formData.invitationToken) {
        try {
          await activateInvitation({
            token: formData.invitationToken,
            email: formData.email,
          });
        } catch (activationError) {
          console.warn('[signup] failed to mark invitation activated', activationError);
        }
      }

      await requestOtp(formData.email, 'signup', {
        turnstileToken: turnstile.token ?? undefined,
      });

      toast({
        title: t('signup.toast.almostThereTitle'),
        description: t('signup.toast.almostThereDesc'),
      });

      setShowTurnstile(false);
      turnstile.reset();
      navigate('/signup/check-email', { state: { email: formData.email } });
    } catch (error) {
      // Handle Turnstile requirement
      if (error instanceof ApiError && error.extra?.requiresTurnstile) {
        setShowTurnstile(true);
        toast({
          title: t('signup.toast.securityRequiredTitle'),
          description: t('signup.toast.securityRequiredRetryDesc'),
          variant: 'destructive',
        });
        setIsSending(false);
        return;
      }
      const appError = handleError(error);
      toast({
        title: t('signup.toast.unableToSendCodeTitle'),
        description: appError.message || t('signup.toast.unableToSendCodeDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleBack = () => {
    updateFormData({ primaryChallenge });
    navigate('/signup/step-4');
  };

  return (
    <SignUpLayout currentStep={5} onBack={handleBack}>
      <div className="space-y-6">
        <div className="mb-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {t('signup.stepLabel', { step: 5 })}
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">
            {t('signup.step5.title')}
          </h2>
          <p className="mt-2 text-sm text-neutral-600">{t('signup.step5.subtitle')}</p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-neutral-700">
            {t('signup.step5.primaryChallengeLabel')} {t('signup.required')}
          </legend>
          {CHALLENGE_KEYS.map((challengeKey) => {
            const optionId = `${challengeGroupId}-${challengeKey}`;
            const isSelected = primaryChallenge === challengeKey;
            return (
              <label
                key={challengeKey}
                htmlFor={optionId}
                className={`flex cursor-pointer items-center rounded-xl border p-3 transition-colors ${
                  isSelected
                    ? 'border-[#05ef62] bg-[#05ef62]/10'
                    : 'border-neutral-200 hover:border-[#05ef62]/60'
                }`}
              >
                <input
                  id={optionId}
                  type="radio"
                  name={challengeGroupId}
                  checked={isSelected}
                  onChange={() => setPrimaryChallenge(challengeKey)}
                  className="me-3"
                />
                <span>{t(`signup.challenges.${challengeKey}`)}</span>
              </label>
            );
          })}
        </fieldset>

        {showTurnstile && (
          <div className="flex justify-center pt-4">
            <Turnstile
              onVerify={turnstile.handleVerify}
              onExpire={turnstile.handleExpire}
              onError={turnstile.handleError}
              theme="light"
            />
          </div>
        )}

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isSending}
            className="rounded-xl border-neutral-200 px-8 py-3 text-neutral-700 hover:bg-neutral-50"
          >
            {t('signup.buttons.back')}
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isSending || !primaryChallenge || (showTurnstile && !turnstile.isVerified)}
            className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-8 py-3 font-semibold text-[#101010] shadow hover:brightness-95"
          >
            {isSending ? t('sendingCode') : t('signup.step5.sendLoginCode')}
          </Button>
        </div>
      </div>
    </SignUpLayout>
  );
};

export default Step5;
