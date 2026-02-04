import { Loader2, Tag } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils';

interface PromoCodeInputProps {
  onApply: (code: string) => void;
  onRemove: () => void;
  appliedCode?: string;
  isApplied?: boolean;
  error?: string | null;
  isLoading?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  className?: string;
}

export function PromoCodeInput({
  onApply,
  onRemove,
  appliedCode,
  isApplied = false,
  error,
  isLoading,
  disabled,
  disabledMessage,
  className,
}: PromoCodeInputProps) {
  const inputId = useId();
  const [expanded, setExpanded] = useState(Boolean(appliedCode) || Boolean(error));
  const [value, setValue] = useState(appliedCode ?? '');

  useEffect(() => {
    if (appliedCode) {
      setValue(appliedCode);
      setExpanded(true);
    }
  }, [appliedCode]);

  useEffect(() => {
    if (error) {
      setExpanded(true);
    }
  }, [error]);

  const handleApply = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    const normalized = trimmed.toUpperCase();
    setValue(normalized);
    onApply(normalized);
  };

  if (disabled) {
    return (
      <div
        className={cn('rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3', className)}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Promo code</p>
        <p className="mt-1 text-sm text-neutral-600">
          {disabledMessage ?? 'Promo codes are not available for this purchase.'}
        </p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-sm font-medium text-neutral-600"
          onClick={() => setExpanded(true)}
        >
          Have a promo code?
        </Button>
      </div>
    );
  }

  if (isApplied && appliedCode) {
    return (
      <div
        className={cn('rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3', className)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
            <Tag className="h-4 w-4" />
            <span>{appliedCode} applied</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove} className="text-emerald-800">
            Remove
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleApply}
      className={cn('rounded-xl border border-neutral-200 bg-white px-4 py-3', className)}
    >
      <Label
        htmlFor={inputId}
        className="text-xs font-medium uppercase tracking-wide text-neutral-500"
      >
        Promo code
      </Label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          id={inputId}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Enter code"
          className="h-9 flex-1 rounded-lg"
        />
        <Button type="submit" size="sm" disabled={isLoading || value.trim().length === 0}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Apply
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </form>
  );
}
