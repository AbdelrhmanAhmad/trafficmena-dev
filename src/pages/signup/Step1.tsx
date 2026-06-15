import { Loader2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackSignUpStep } from '@/lib/analytics/events';
import SignUpLayout, { useSignUpContext } from '@/shared/components/layout/SignUpLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

const Step1: React.FC = () => {
  const navigate = useNavigate();
  const { formData, updateFormData, setCurrentStep: setSignUpCurrentStep } = useSignUpContext();
  const [firstName, setFirstName] = useState(formData.firstName);
  const [lastName, setLastName] = useState(formData.lastName);
  const firstNameId = useId();
  const lastNameId = useId();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
  }>({});

  useEffect(() => {
    setSignUpCurrentStep(1);
  }, [setSignUpCurrentStep]);

  const validateName = (name: string, field: string): string | undefined => {
    if (!name.trim()) return `${field} is required`;
    if (name.trim().length < 2) return `${field} must be at least 2 characters`;
    if (!/^[\p{L}\s'-]+$/u.test(name))
      return `${field} can only contain letters, spaces, hyphens, and apostrophes`;
    return undefined;
  };

  const validateForm = () => {
    const newErrors: { firstName?: string; lastName?: string } = {};
    newErrors.firstName = validateName(firstName, 'First name');
    newErrors.lastName = validateName(lastName, 'Last name');
    setErrors(newErrors);
    return !newErrors.firstName && !newErrors.lastName;
  };

  const handleNext = async () => {
    if (validateForm()) {
      setIsLoading(true);
      // Simulate a brief loading state for better UX
      await new Promise((resolve) => setTimeout(resolve, 300));
      updateFormData({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      trackSignUpStep(1, 'name_info');
      navigate('/signup/step-2');
      setIsLoading(false);
    }
  };

  const isValid =
    firstName.trim() && lastName.trim() && !errors.firstName && !errors.lastName && !isLoading;

  return (
    <SignUpLayout currentStep={1} showBackButton={false}>
      <div className="space-y-6">
        <div className="mb-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Step 1
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">
            Tell us about yourself
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Let&apos;s start with your basic information.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor={firstNameId} className="text-sm font-medium text-neutral-700">
              First Name *
            </Label>
            <Input
              id={firstNameId}
              type="text"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (errors.firstName) {
                  setErrors((prev) => ({ ...prev, firstName: undefined }));
                }
              }}
              placeholder="Enter your first name"
              className={`mt-1 rounded-xl border-neutral-200 ${errors.firstName ? 'border-red-500' : ''}`}
              required
            />
            {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>}
          </div>

          <div>
            <Label htmlFor={lastNameId} className="text-sm font-medium text-neutral-700">
              Last Name *
            </Label>
            <Input
              id={lastNameId}
              type="text"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (errors.lastName) {
                  setErrors((prev) => ({ ...prev, lastName: undefined }));
                }
              }}
              placeholder="Enter your last name"
              className={`mt-1 rounded-xl border-neutral-200 ${errors.lastName ? 'border-red-500' : ''}`}
              required
            />
            {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <Button
            onClick={handleNext}
            disabled={!isValid}
            className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-8 py-3 font-semibold text-[#101010] shadow hover:brightness-95"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </div>
    </SignUpLayout>
  );
};

export default Step1;
