
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignUpLayout, { useSignUpContext } from '@/components/SignUpLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/utils/errorHandling';

const Step5: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const { formData, updateFormData } = useSignUpContext();
  const [primaryChallenge, setPrimaryChallenge] = useState(formData.primaryChallenge);
  const [isLoading, setIsLoading] = useState(false);

  const challengeOptions = [
    'Generating more high-quality leads',
    'Improving ROI on my marketing spend',
    'Proving the value of marketing to my boss',
    'Keeping up with the latest marketing trends',
    'Building and managing a successful team'
  ];

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Update the context with the current primary challenge
      updateFormData({ primaryChallenge });

      const userData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        display_name: `${formData.firstName} ${formData.lastName}`.trim(),
        phone_number: formData.phoneNumber,
        type: 'learner',
        primary_goal: formData.primaryGoal,
        primary_challenge: primaryChallenge
      };

      if (formData.loginMethod === 'magic') {
        // For magic link: send magic link with all user data
        const { error } = await supabase.auth.signInWithOtp({
          email: formData.email,
          options: {
            emailRedirectTo: `${window.location.origin}/thank-you`,
            data: userData
          }
        });

        if (error) {
          const appError = handleError(error);
          toast({
            title: 'Failed to Send Magic Link',
            description: appError.message || 'There was an error sending the magic link. Please try again.',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Magic Link Sent!',
          description: 'Please check your email and click the link to complete your account creation.',
        });

        navigate('/signup/check-email', { state: { email: formData.email } });
      } else {
        // For password method: create account directly
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/thank-you`,
            data: userData
          }
        });

        if (error) {
          const appError = handleError(error);
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account Already Exists',
              description: 'An account with this email already exists. Please try signing in instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign-up Failed',
              description: appError.message || 'There was an error creating your account. Please try again.',
              variant: 'destructive',
            });
          }
          return;
        }

        toast({
          title: 'Account Created Successfully!',
          description: 'Welcome to TrafficMENA! Please check your email to verify your account.',
        });

        navigate('/thank-you');
      }
    } catch (error) {
      const appError = handleError(error);
      toast({
        title: 'Sign-up Failed',
        description: appError.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    updateFormData({ primaryChallenge });
    navigate('/signup/step-4');
  };

  const isValid = primaryChallenge.trim();

  return (
    <SignUpLayout currentStep={5} onBack={handleBack}>
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-primary mb-4">What's your biggest challenge at work?</h2>
          <p className="text-gray-600">We'll recommend experts and content that can help solve this.</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="primaryChallenge" className="text-sm font-medium text-gray-700">
              Primary Challenge *
            </Label>
            <div className="mt-3 space-y-2">
              {challengeOptions.map((option) => (
                <div key={option} className={`flex items-center p-3 rounded-md border cursor-pointer ${primaryChallenge === option ? 'border-primary' : 'border-gray-200'}`} onClick={() => setPrimaryChallenge(option)}>
                  <input
                    type="radio"
                    name="primaryChallenge"
                    checked={primaryChallenge === option}
                    onChange={() => setPrimaryChallenge(option)}
                    className="mr-3"
                  />
                  <span>{option}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            className="px-8 py-3"
            disabled={isLoading}
          >
            Back
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!isValid || isLoading}
            className="bg-gradient-to-r from-primary-green to-primary-gradient hover:from-primary-gradient hover:to-secondary-teal text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300"
          >
            {isLoading 
              ? (formData.loginMethod === 'magic' ? 'Sending Magic Link...' : 'Creating Account...') 
              : (formData.loginMethod === 'magic' ? 'Send Magic Link' : 'Finish & See My Dashboard')
            }
          </Button>
        </div>
      </div>
    </SignUpLayout>
  );
};

export default Step5;
