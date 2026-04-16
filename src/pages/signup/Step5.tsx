import type React from 'react';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/app/api/client';
import { activateInvitation } from '@/app/api/invitations';
import { trackSignUp, trackSignUpStep } from '@/lib/analytics/events';
import { buildCompletedSignUpTrackingParams } from '@/lib/analytics/signup';
import SignUpLayout, { useSignUpContext } from '@/shared/components/layout/SignUpLayout';
import { Turnstile, useTurnstile } from '@/shared/components/Turnstile';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useErrorHandler } from '@/shared/utils/errorHandling';
import { persistSignupProfile } from './persistProfile';

const challengeOptions = [
  'Generating more high-quality leads',
  'Improving ROI on my marketing spend',
  'Proving the value of marketing to my boss',
  'Keeping up with the latest marketing trends',
  'Building and managing a successful team',
];

const Step5: React.FC = () => {
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
  const acceptanceCacheKey = 'trafficmena:invitation-acceptance';

  const handleComplete = async () => {
    if (!formData.email) {
      toast({
        title: 'Missing email',
        description: 'Please add your email before finishing signup.',
        variant: 'destructive',
      });
      navigate('/signup/step-2');
      return;
    }

    // If Turnstile is shown but not verified, block submission
    if (showTurnstile && !turnstile.isVerified) {
      toast({
        title: 'Security check required',
        description: 'Please complete the security check below.',
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
          const activationResult = await activateInvitation({
            token: formData.invitationToken,
            email: formData.email,
          });
          if (activationResult.sessionCreated) {
            await persistSignupProfile({
              ...formData,
              primaryChallenge,
            });
            try {
              sessionStorage.removeItem(acceptanceCacheKey);
            } catch {
              // ignore storage errors
            }
            const trackingParams = buildCompletedSignUpTrackingParams({
              authUserId: activationResult.userId,
              invitationUserId: formData.invitationUserId,
              email: formData.email,
              phone: formData.phoneNumber,
              firstName: formData.firstName,
              lastName: formData.lastName,
            });
            if (trackingParams) {
              trackSignUp(trackingParams);
            } else {
              console.warn('[analytics] skipped sign_up because no invited user id was available');
            }
            toast({
              title: 'Welcome to TrafficMENA',
              description: 'Your account is active and you are signed in.',
            });
            navigate('/dashboard');
            return;
          }
        } catch (activationError) {
          console.warn('[signup] failed to mark invitation activated', activationError);
        }
      }

      await requestOtp(formData.email, 'signup', {
        turnstileToken: turnstile.token ?? undefined,
      });

      toast({
        title: 'Almost there!',
        description: 'We sent you a login code. Enter it to activate your account.',
      });

      setShowTurnstile(false);
      turnstile.reset();
      navigate('/signup/check-email', { state: { email: formData.email } });
    } catch (error) {
      // Handle Turnstile requirement
      if (error instanceof ApiError && error.extra?.requiresTurnstile) {
        setShowTurnstile(true);
        toast({
          title: 'Security check required',
          description: 'Please complete the security check below and try again.',
          variant: 'destructive',
        });
        setIsSending(false);
        return;
      }
      const appError = handleError(error);
      toast({
        title: 'Unable to send code',
        description: appError.message || 'Please try again or use a different email.',
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
            Step 5
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">
            What&apos;s your biggest challenge at work?
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            We&apos;ll recommend experts and content that can help solve this.
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-neutral-700">Primary Challenge *</legend>
          {challengeOptions.map((option, index) => {
            const optionId = `${challengeGroupId}-${index}`;
            const isSelected = primaryChallenge === option;
            return (
              <label
                key={option}
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
                  onChange={() => setPrimaryChallenge(option)}
                  className="mr-3"
                />
                <span>{option}</span>
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
            Back
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isSending || !primaryChallenge || (showTurnstile && !turnstile.isVerified)}
            className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-8 py-3 font-semibold text-[#101010] shadow hover:brightness-95"
          >
            {isSending ? 'Sending code…' : 'Send me a login code'}
          </Button>
        </div>
      </div>
    </SignUpLayout>
  );
};

export default Step5;
