
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignUpLayout, { useSignUpContext } from '@/components/SignUpLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const Step1: React.FC = () => {
  const navigate = useNavigate();
  const { formData, updateFormData } = useSignUpContext();
  const [firstName, setFirstName] = useState(formData.firstName);
  const [lastName, setLastName] = useState(formData.lastName);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{firstName?: string; lastName?: string}>({});

  const validateName = (name: string, field: string): string | undefined => {
    if (!name.trim()) return `${field} is required`;
    if (name.trim().length < 2) return `${field} must be at least 2 characters`;
    if (!/^[a-zA-Z\s'-]+$/.test(name)) return `${field} can only contain letters, spaces, hyphens, and apostrophes`;
    return undefined;
  };

  const validateForm = () => {
    const newErrors: {firstName?: string; lastName?: string} = {};
    newErrors.firstName = validateName(firstName, 'First name');
    newErrors.lastName = validateName(lastName, 'Last name');
    setErrors(newErrors);
    return !newErrors.firstName && !newErrors.lastName;
  };

  const handleNext = async () => {
    if (validateForm()) {
      setIsLoading(true);
      // Simulate a brief loading state for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      updateFormData({ firstName: firstName.trim(), lastName: lastName.trim() });
      navigate('/signup/step-2');
      setIsLoading(false);
    }
  };

  const isValid = firstName.trim() && lastName.trim() && !errors.firstName && !errors.lastName && !isLoading;

  return (
    <SignUpLayout currentStep={1} showBackButton={false}>
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-primary mb-4">Tell us about yourself</h2>
          <p className="text-gray-600">Let's start with your basic information</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
              First Name *
            </Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (errors.firstName) {
                  setErrors(prev => ({...prev, firstName: undefined}));
                }
              }}
              placeholder="Enter your first name"
              className={`mt-1 ${errors.firstName ? 'border-red-500' : ''}`}
              required
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
              Last Name *
            </Label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (errors.lastName) {
                  setErrors(prev => ({...prev, lastName: undefined}));
                }
              }}
              placeholder="Enter your last name"
              className={`mt-1 ${errors.lastName ? 'border-red-500' : ''}`}
              required
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <Button
            onClick={handleNext}
            disabled={!isValid}
            className="bg-gradient-to-r from-primary-green to-primary-gradient hover:from-primary-gradient hover:to-secondary-teal text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300"
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
