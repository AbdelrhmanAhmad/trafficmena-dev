import type React from 'react';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

type BilingualTextFieldProps = {
  label: string;
  englishLabel?: string;
  arabicLabel?: string;
  valueEn: string;
  valueAr: string;
  onChangeEn: (value: string) => void;
  onChangeAr: (value: string) => void;
  englishPlaceholder?: string;
  arabicPlaceholder?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
};

export const BilingualTextField: React.FC<BilingualTextFieldProps> = ({
  label,
  englishLabel = 'Title (English)',
  arabicLabel = 'Title (Arabic)',
  valueEn,
  valueAr,
  onChangeEn,
  onChangeAr,
  englishPlaceholder,
  arabicPlaceholder,
  required = false,
  multiline = false,
  rows = 4,
  className,
}) => {
  const InputComponent = multiline ? 'textarea' : Input;

  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-sm font-medium text-neutral-800">{label}</p>
      <div className="space-y-2">
        <Label htmlFor={`${label}-en`}>
          {englishLabel}
          {required ? ' *' : ''}
        </Label>
        {multiline ? (
          <textarea
            id={`${label}-en`}
            dir="ltr"
            lang="en"
            rows={rows}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={valueEn}
            placeholder={englishPlaceholder}
            onChange={(event) => onChangeEn(event.target.value)}
          />
        ) : (
          <Input
            id={`${label}-en`}
            dir="ltr"
            lang="en"
            value={valueEn}
            placeholder={englishPlaceholder}
            onChange={(event) => onChangeEn(event.target.value)}
          />
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${label}-ar`}>
          {arabicLabel}
          {required ? ' *' : ''}
        </Label>
        {multiline ? (
          <textarea
            id={`${label}-ar`}
            dir="rtl"
            lang="ar"
            rows={rows}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-right"
            value={valueAr}
            placeholder={arabicPlaceholder}
            onChange={(event) => onChangeAr(event.target.value)}
          />
        ) : (
          <Input
            id={`${label}-ar`}
            dir="rtl"
            lang="ar"
            className="text-right"
            value={valueAr}
            placeholder={arabicPlaceholder}
            onChange={(event) => onChangeAr(event.target.value)}
          />
        )}
      </div>
    </div>
  );
};
