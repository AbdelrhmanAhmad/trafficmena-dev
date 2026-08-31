import type React from 'react';
import { LazyEditor } from '@/shared/components/LazyEditor';
import { Label } from '@/shared/components/ui/label';

type BilingualRichTextFieldProps = {
  label: string;
  valueEn: string;
  valueAr: string;
  onChangeEn: (value: string) => void;
  onChangeAr: (value: string) => void;
  required?: boolean;
};

export const BilingualRichTextField: React.FC<BilingualRichTextFieldProps> = ({
  label,
  valueEn,
  valueAr,
  onChangeEn,
  onChangeAr,
  required = false,
}) => (
  <div className="space-y-4">
    <p className="text-sm font-medium text-neutral-800">
      {label}
      {required ? ' *' : ''}
    </p>
    <div className="space-y-2">
      <Label>Description (English)</Label>
      <div dir="ltr" lang="en">
        <LazyEditor value={valueEn} onChange={onChangeEn} />
      </div>
    </div>
    <div className="space-y-2">
      <Label>Description (Arabic)</Label>
      <div dir="rtl" lang="ar">
        <LazyEditor value={valueAr} onChange={onChangeAr} />
      </div>
    </div>
  </div>
);
