import { Loader2 } from 'lucide-react';
import type { PaymentMethod } from '@/app/api/payments';
import { usePaymentMethods } from '@/app/hooks/usePayments';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { cn } from '@/shared/lib/utils';

interface PaymentMethodSelectorProps {
  value: number | null;
  onChange: (methodId: number) => void;
  disabled?: boolean;
  enabled?: boolean;
}

export function PaymentMethodSelector({
  value,
  onChange,
  disabled,
  enabled = true,
}: PaymentMethodSelectorProps) {
  const shouldFetch = enabled;
  const {
    data: methods,
    isLoading,
    isFetching,
    error,
    refetch,
  } = usePaymentMethods({ enabled: shouldFetch });

  if (!shouldFetch) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-center text-sm text-neutral-600">
        Sign in to view payment methods.
      </div>
    );
  }

  // Show spinner on initial load or while retrying after an error
  if (isLoading || (isFetching && error)) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading payment methods...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
        <p>Unable to load payment methods.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Try again
        </Button>
      </div>
    );
  }

  if (!methods?.length) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-center text-sm text-neutral-600">
        No payment methods available at the moment.
      </div>
    );
  }

  return (
    <RadioGroup
      value={value?.toString() ?? ''}
      onValueChange={(val) => onChange(Number(val))}
      disabled={disabled}
      className="grid gap-3"
    >
      {methods.map((method) => (
        <PaymentMethodCard
          key={method.paymentId}
          method={method}
          isSelected={value === method.paymentId}
          disabled={disabled}
        />
      ))}
    </RadioGroup>
  );
}

interface PaymentMethodCardProps {
  method: PaymentMethod;
  isSelected: boolean;
  disabled?: boolean;
}

function PaymentMethodCard({ method, isSelected, disabled }: PaymentMethodCardProps) {
  return (
    <Label
      htmlFor={`payment-${method.paymentId}`}
      className={cn(
        'flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all',
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50 hover:bg-muted/50',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <RadioGroupItem value={method.paymentId.toString()} id={`payment-${method.paymentId}`} />

      <div className="flex h-10 w-16 items-center justify-center rounded-lg bg-white">
        {method.logo ? (
          <img
            src={method.logo}
            alt={method.name_en}
            className="max-h-8 max-w-full object-contain"
          />
        ) : (
          <span className="px-1 text-center text-[10px] font-semibold text-neutral-600">
            {method.name_en}
          </span>
        )}
      </div>

      <span className="font-medium">{method.name_en}</span>
    </Label>
  );
}
