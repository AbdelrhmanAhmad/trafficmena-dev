import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  useSubscriptionSettings,
  useUpdateSubscriptionSettings,
} from '@/app/hooks/useSubscriptions';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { useToast } from '@/shared/hooks/custom/use-toast';

const subscriptionSettingsSchema = z.object({
  annualPriceEgp: z
    .string()
    .refine(
      (value) =>
        !value || (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100000),
      'Price must be between 0 and 100,000 EGP.',
    ),
  subscriberDiscountPercent: z
    .string()
    .refine(
      (value) =>
        !value || (!Number.isNaN(Number(value)) && Number(value) >= 1 && Number(value) <= 99),
      'Discount must be between 1 and 99%.',
    ),
});

type SubscriptionSettingsFormValues = z.infer<typeof subscriptionSettingsSchema>;

interface SubscriptionSettingsCardProps {
  canEdit: boolean;
}

export function SubscriptionSettingsCard({ canEdit }: SubscriptionSettingsCardProps) {
  const { toast } = useToast();
  const { data: settings, isLoading } = useSubscriptionSettings();
  const updateSettings = useUpdateSubscriptionSettings();

  const form = useForm<SubscriptionSettingsFormValues>({
    resolver: zodResolver(subscriptionSettingsSchema),
    defaultValues: {
      annualPriceEgp: '',
      subscriberDiscountPercent: '',
    },
  });

  useEffect(() => {
    if (settings) {
      const discountValue = settings.subscriberDiscountPercent;
      const normalizedDiscount =
        discountValue !== null &&
        discountValue !== undefined &&
        discountValue >= 1 &&
        discountValue <= 99
          ? String(discountValue)
          : '';
      form.reset({
        annualPriceEgp: settings.annualSubscriptionPriceCents
          ? String(settings.annualSubscriptionPriceCents / 100)
          : settings.annualSubscriptionPriceCents === 0
            ? '0'
            : '',
        subscriberDiscountPercent: normalizedDiscount,
      });
    }
  }, [settings, form]);

  const handleSubmit = async (values: SubscriptionSettingsFormValues) => {
    if (!canEdit) return;

    const payload = {
      annualSubscriptionPriceCents: values.annualPriceEgp
        ? Math.round(Number(values.annualPriceEgp) * 100)
        : null,
      subscriberDiscountPercent: values.subscriberDiscountPercent
        ? Number(values.subscriberDiscountPercent)
        : null,
    };

    updateSettings.mutate(payload, {
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : 'Unable to update settings. Please try again.';
        toast({
          title: 'Update failed',
          description: message,
          variant: 'destructive',
        });
      },
      onSuccess: () => {
        toast({
          title: 'Settings updated',
          description: 'Subscription settings have been saved.',
        });
      },
    });
  };

  if (isLoading) {
    return (
      <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
            <CreditCard className="h-5 w-5 text-[#05ef62]" />
          </div>
          <div>
            <CardTitle className="text-neutral-900">Subscription Settings</CardTitle>
            <CardDescription>
              Configure pricing for annual subscriptions and member discounts.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="annualPriceEgp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Annual Subscription Price (EGP)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. 1500"
                        inputMode="decimal"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Yearly subscription price. Leave empty to disable subscriptions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subscriberDiscountPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscriber Discount (%)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. 20"
                        inputMode="numeric"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Discount percentage for subscribers on paid events/tracks.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {canEdit ? (
              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Settings
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only owners and admins can change these settings.
              </p>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
