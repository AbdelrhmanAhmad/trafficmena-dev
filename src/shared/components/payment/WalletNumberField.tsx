import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  assembleE164,
  digitsOnly,
  EGYPT_DIAL,
  isValidEgyptMobile,
  normalizeLocalPart,
  parseE164,
} from '@/shared/utils/phone';

// Mirrors the server heuristic (normalizedMethodName.includes('mobilewallet')) so the client shows
// the wallet-number field for exactly the methods the server treats as requiring a wallet number.
export function isWalletMethod(nameEn?: string | null): boolean {
  return (nameEn ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .includes('mobilewallet');
}

interface WalletNumberFieldProps {
  // The user's stored profile phone (E.164) used to prefill the field; editable.
  profilePhone?: string | null;
  disabled?: boolean;
  // Reports the current value: a valid Egyptian E.164 number, or null when empty/invalid.
  onChange: (e164: string | null) => void;
}

export function WalletNumberField({ profilePhone, disabled, onChange }: WalletNumberFieldProps) {
  const { t } = useTranslation('payments');
  const inputId = useId();
  const [local, setLocal] = useState(() => parseE164(profilePhone).local);
  const [touched, setTouched] = useState(false);
  const prefilledRef = useRef(Boolean(parseE164(profilePhone).local));

  // Prefill once if the profile phone arrives after mount (async /users/me load).
  useEffect(() => {
    if (prefilledRef.current) return;
    const seeded = parseE164(profilePhone).local;
    if (seeded) {
      prefilledRef.current = true;
      setLocal(seeded);
    }
  }, [profilePhone]);

  const normalized = normalizeLocalPart(local, EGYPT_DIAL);
  const valid = isValidEgyptMobile(normalized);

  // Report the current value up on every change (onChange is a stable setter from the parent).
  useEffect(() => {
    onChange(valid ? assembleE164(EGYPT_DIAL, normalized) : null);
  }, [normalized, valid, onChange]);

  const showError = touched && local.trim().length > 0 && !valid;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{t('walletNumberLabel')}</Label>
      <div className="flex items-center overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <span className="select-none px-3 text-muted-foreground text-sm">+20</span>
        <Input
          aria-invalid={showError}
          autoComplete="tel-national"
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          disabled={disabled}
          id={inputId}
          inputMode="numeric"
          onBlur={() => setTouched(true)}
          onChange={(e) => setLocal(digitsOnly(e.target.value).replace(/^0/, ''))}
          placeholder="1012345678"
          value={local}
        />
      </div>
      <p className={showError ? 'text-destructive text-xs' : 'text-muted-foreground text-xs'}>
        {showError ? t('walletInvalidNumber') : t('walletNumberHint')}
      </p>
    </div>
  );
}
