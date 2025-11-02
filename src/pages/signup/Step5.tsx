import type React from 'react';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { activateInvitation } from '@/app/api/invitations';
import SignUpLayout, { useSignUpContext } from '@/shared/components/layout/SignUpLayout';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
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
  const { formData, updateFormData } = useSignUpContext();
  const [primaryChallenge, setPrimaryChallenge] = useState(formData.primaryChallenge);
  const [isSending, setIsSending] = useState(false);
  const primaryChallengeId = useId();
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

    setIsSending(true);

    try {
      updateFormData({ primaryChallenge });

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

      await requestOtp(formData.email);

      toast({
        title: 'Almost there!',
        description: 'We sent you a login code. Enter it to activate your account.',
      });

      navigate('/signup/check-email', { state: { email: formData.email } });
    } catch (error) {
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

        <div className="space-y-4">
          <div>
            <Label htmlFor={primaryChallengeId} className="text-sm font-medium text-neutral-700">
              Primary Challenge *
            </Label>
            <Select value={primaryChallenge} onValueChange={setPrimaryChallenge}>
              <SelectTrigger id={primaryChallengeId} className="mt-1 rounded-xl border-neutral-200">
                <SelectValue placeholder="Select your primary challenge" />
              </SelectTrigger>
              <SelectContent>
                {challengeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

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
            disabled={isSending || !primaryChallenge}
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
