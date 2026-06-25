import { useEffect, useId, useState } from 'react';
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
import { MENA_COUNTRIES, OTHER_COUNTRIES } from '@/shared/data/countries';
import {
  assembleE164,
  dialForCode,
  digitsOnly,
  EGYPT_PHONE_HELPER,
  normalizeLocalPart,
  parseE164,
  validateLocalPart,
} from '@/shared/utils/phone';

type PhoneNumberFieldProps = {
  value: string; // stored E.164 (or '')
  onChange: (e164: string) => void;
  label?: string;
};

// Country-selector + local-part phone input that stores a single E.164 string. Egypt-specific
// leading-zero stripping + prefix validation apply on blur, to the local portion only.
export function PhoneNumberField({
  value,
  onChange,
  label = 'Phone Number',
}: PhoneNumberFieldProps) {
  const fieldId = useId();
  const errorId = useId();
  const [code, setCode] = useState(() => parseE164(value).code);
  const [local, setLocal] = useState(() => parseE164(value).local);
  const [error, setError] = useState<string | null>(null);

  // Re-seed from an externally pushed value (e.g. async profile load). The guard skips when the
  // incoming value already matches our internal state, so user edits never get clobbered and empty
  // local values keep the selected country.
  useEffect(() => {
    if (assembleE164(dialForCode(code), local) !== value) {
      const parsed = parseE164(value);
      setCode(parsed.code);
      setLocal(parsed.local);
      setError(null);
    }
  }, [value, code, local]);

  const dial = dialForCode(code);

  const handleCodeChange = (nextCode: string) => {
    setCode(nextCode);
    setError(null);
    onChange(assembleE164(dialForCode(nextCode), local));
  };

  const handleLocalChange = (raw: string) => {
    const digits = digitsOnly(raw);
    setLocal(digits);
    setError(null);
    onChange(assembleE164(dial, digits));
  };

  const handleBlur = () => {
    const normalized = normalizeLocalPart(local, dial);
    setLocal(normalized);
    setError(validateLocalPart(normalized, dial));
    onChange(assembleE164(dial, normalized));
  };

  return (
    <div>
      <Label htmlFor={fieldId}>{label}</Label>
      <div className="mt-1 flex gap-2">
        <Select value={code} onValueChange={handleCodeChange}>
          <SelectTrigger className="w-[130px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>MENA Region</SelectLabel>
              {MENA_COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.flag} +{country.dial}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Other Countries</SelectLabel>
              {OTHER_COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.flag} +{country.dial}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input
          id={fieldId}
          type="tel"
          dir="ltr"
          className="flex-1"
          value={local}
          onChange={(event) => handleLocalChange(event.target.value)}
          onBlur={handleBlur}
          placeholder="1012345678"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-destructive" id={errorId} aria-live="polite">
          {error}
        </p>
      ) : null}
      {code === 'EG' ? (
        <p className="mt-1 text-xs text-muted-foreground">{EGYPT_PHONE_HELPER}</p>
      ) : null}
    </div>
  );
}
