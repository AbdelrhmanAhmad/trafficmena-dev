import type React from 'react';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackSignUpStep } from '@/lib/analytics/events';
import SignUpLayout, { useSignUpContext } from '@/shared/components/layout/SignUpLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  ALL_COUNTRIES,
  ALL_COUNTRIES_BY_DIAL_DESC,
  MENA_COUNTRIES,
  OTHER_COUNTRIES,
} from '@/shared/data/countries';

const WHATSAPP_SVG_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.569-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488z';

const MIN_LOCAL_DIGITS = 7;
const DEFAULT_COUNTRY = MENA_COUNTRIES[0];

// Match a stored phone string like "+971501234567" to a known country code
function parseSavedPhone(saved: string) {
  if (!saved || !saved.startsWith('+')) return { code: DEFAULT_COUNTRY.code, local: '' };
  const withoutPlus = saved.slice(1);
  for (const c of ALL_COUNTRIES_BY_DIAL_DESC) {
    if (withoutPlus.startsWith(c.dial)) {
      return { code: c.code, local: withoutPlus.slice(c.dial.length) };
    }
  }
  return { code: DEFAULT_COUNTRY.code, local: withoutPlus };
}

const Step3: React.FC = () => {
  const navigate = useNavigate();
  const { formData, updateFormData } = useSignUpContext();
  const phoneInputId = useId();

  // Parsed once on mount; we only need the initial values for seeding state below
  const [{ code: initCode, local: initLocal }] = useState(() =>
    parseSavedPhone(formData.phoneNumber),
  );
  const [selectedCode, setSelectedCode] = useState(initCode);
  const [localNumber, setLocalNumber] = useState(initLocal);
  const [errors, setErrors] = useState<{ phoneNumber?: string }>({});

  const validatePhone = (): string | undefined => {
    if (!localNumber) return 'WhatsApp number is required';
    if (localNumber.length < MIN_LOCAL_DIGITS) return 'Phone number too short';
    if (localNumber.length > 15) return 'Phone number too long';
    if (!/^\d+$/.test(localNumber)) return 'Please enter a valid phone number';
    return undefined;
  };

  const buildFullPhone = () => {
    const dial = ALL_COUNTRIES.find((c) => c.code === selectedCode)?.dial ?? DEFAULT_COUNTRY.dial;
    return `+${dial}${localNumber}`;
  };

  const handleNext = () => {
    const phoneError = validatePhone();
    if (phoneError) {
      setErrors({ phoneNumber: phoneError });
      return;
    }
    updateFormData({ phoneNumber: buildFullPhone() });
    trackSignUpStep(4, 'phone_entered');
    navigate('/signup/step-4');
  };

  const handleBack = () => {
    updateFormData({ phoneNumber: buildFullPhone() });
    navigate('/signup/step-2');
  };

  const isValid = localNumber.length >= MIN_LOCAL_DIGITS && !errors.phoneNumber;

  return (
    <SignUpLayout currentStep={3} onBack={handleBack}>
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
            <div className="mt-1 flex gap-2">
              <Select
                value={selectedCode}
                onValueChange={(code) => {
                  setSelectedCode(code);
                  if (errors.phoneNumber) setErrors({});
                }}
              >
                <SelectTrigger className="w-[130px] shrink-0 rounded-xl border-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>MENA Region</SelectLabel>
                    {MENA_COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} +{c.dial}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Other Countries</SelectLabel>
                    {OTHER_COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} +{c.dial}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="relative flex-1">
                <Input
                  id={phoneInputId}
                  type="tel"
                  dir="ltr"
                  value={localNumber}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setLocalNumber(digits);
                    if (errors.phoneNumber) setErrors({});
                  }}
                  placeholder="1234567890"
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
                    <path d={WHATSAPP_SVG_PATH} />
                  </svg>
                </div>
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
                <path d={WHATSAPP_SVG_PATH} />
              </svg>
              A WhatsApp number is required for event communication.
            </p>
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            className="rounded-xl border-neutral-200 px-8 py-3 text-neutral-700 hover:bg-neutral-50"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isValid}
            className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-8 py-3 font-semibold text-[#101010] shadow hover:brightness-95"
          >
            Next
          </Button>
        </div>
      </div>
    </SignUpLayout>
  );
};

export default Step3;
