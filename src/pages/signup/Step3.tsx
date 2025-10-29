import { Loader2 } from 'lucide-react';
import type React from 'react';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignUpLayout, { useSignUpContext } from '@/shared/components/layout/SignUpLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

const Step3: React.FC = () => {
  const navigate = useNavigate();
  const { formData, updateFormData } = useSignUpContext();
  const [phoneNumber, setPhoneNumber] = useState(formData.phoneNumber || '+20');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ phoneNumber?: string }>({});
  const phoneInputId = useId();

  const validatePhone = (phone: string): string | undefined => {
    if (!phone.trim()) return 'WhatsApp number is required';
    // Remove +20 prefix for validation if present
    const cleanPhone = phone.replace(/^(\+20)/, '').replace(/[\s\-()]/g, '');
    if (cleanPhone.length < 7) return 'Phone number too short';
    if (cleanPhone.length > 15) return 'Phone number too long';
    // Basic phone number validation
    if (!/^[0-9]+$/.test(cleanPhone)) return 'Please enter a valid phone number';
    return undefined;
  };

  const validateForm = () => {
    const newErrors: { phoneNumber?: string } = {};
    newErrors.phoneNumber = validatePhone(phoneNumber);
    setErrors(newErrors);
    return !newErrors.phoneNumber;
  };

  const handleNext = async () => {
    if (validateForm()) {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
      updateFormData({ phoneNumber: phoneNumber.trim() });
      navigate('/signup/step-4');
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    updateFormData({ phoneNumber: phoneNumber.trim() });
    navigate('/signup/step-2');
    setIsLoading(false);
  };

  const isValid = phoneNumber.trim() && !errors.phoneNumber && !isLoading;

  return (
    <SignUpLayout currentStep={3} totalSteps={5} onBack={handleBack}>
      <div className="space-y-6">
        <div className="mb-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Step 3
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">
            What&apos;s your WhatsApp number?
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            This is how you&apos;ll get instant meetup details, reminders, and Zoom links.
          </p>
          <p className="text-xs text-neutral-500">We will never spam you.</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor={phoneInputId} className="text-sm font-medium text-neutral-700">
              WhatsApp Number *
            </Label>
            <div className="relative mt-1">
              <Input
                id={phoneInputId}
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (errors.phoneNumber) {
                    setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                  }
                }}
                placeholder="+20 123 456 7890"
                className={`rounded-xl border-neutral-200 ${errors.phoneNumber ? 'border-red-500' : ''}`}
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 transform">
                <svg
                  className="h-5 w-5 text-green-500"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.569-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488z" />
                </svg>
              </div>
            </div>
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-500">{errors.phoneNumber}</p>
            )}
            <p className="mt-1 flex items-center text-xs text-neutral-500">
              <svg
                className="mr-1 h-4 w-4 text-green-500"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.569-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488z" />
              </svg>
              A WhatsApp number is required for event communication.
            </p>
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isLoading}
            className="rounded-xl border-neutral-200 px-8 py-3 text-neutral-700 hover:bg-neutral-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Back'
            )}
          </Button>
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

export default Step3;
