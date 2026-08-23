import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CheckoutRequest,
  CheckoutResponse,
  Payment,
  PaymentItemType,
  PaymentMethod,
  PricePreview,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from '@/app/api/payments';
import {
  createCheckout,
  fetchPayment,
  fetchPaymentMethods,
  fetchPricePreview,
  verifyPayment,
} from '@/app/api/payments';
import { currentUserQueryKey } from '@/app/queryKeys';

const PAYMENT_METHODS_KEY = ['payment-methods'];
const PAYMENT_KEY = ['payment'];
const PRICE_PREVIEW_KEY = ['price-preview'];

export function usePaymentMethods(options?: { enabled?: boolean }) {
  return useQuery<PaymentMethod[]>({
    queryKey: PAYMENT_METHODS_KEY,
    queryFn: ({ signal }) => fetchPaymentMethods(signal),
    staleTime: 5 * 60 * 1000, // 5 minutes - methods rarely change
    retry: 1, // Server-side cache handles resilience; one retry for transient blips
    enabled: options?.enabled ?? true,
  });
}

export function useCreateCheckout() {
  const queryClient = useQueryClient();

  return useMutation<CheckoutResponse, Error, CheckoutRequest>({
    mutationFn: createCheckout,
    onSuccess: () => {
      // Invalidate subscription info after purchase
      queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
    },
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation<VerifyPaymentResponse, Error, VerifyPaymentRequest>({
    mutationFn: verifyPayment,
    onSuccess: (data) => {
      if (data.status === 'paid') {
        // Invalidate all related queries on successful payment
        queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
        queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['tracks'] });
        queryClient.invalidateQueries({ queryKey: ['series'] });
        queryClient.invalidateQueries({ queryKey: ['series-store'] });
        queryClient.invalidateQueries({ queryKey: ['digital-products'] });
        // Refresh user aggregates so global_variables reflects updated totals
        queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
      }
    },
  });
}

export function usePayment(paymentId: string | undefined) {
  return useQuery<Payment>({
    queryKey: [...PAYMENT_KEY, paymentId],
    queryFn: () => {
      if (!paymentId) throw new Error('Payment ID required');
      return fetchPayment(paymentId);
    },
    enabled: !!paymentId,
    staleTime: 30 * 1000, // 30 seconds - status may change
  });
}

export function usePricePreview(
  itemType: PaymentItemType | undefined,
  itemId?: string,
  promoCode?: string,
  options?: { enabled?: boolean; requestKey?: number | string },
) {
  return useQuery<PricePreview>({
    queryKey: [...PRICE_PREVIEW_KEY, itemType, itemId, promoCode, options?.requestKey ?? 'default'],
    queryFn: ({ signal }) => {
      if (!itemType) throw new Error('Item type required');
      return fetchPricePreview(itemType, itemId, promoCode, signal);
    },
    enabled: (options?.enabled ?? true) && !!itemType,
    staleTime: 60 * 1000, // 1 minute - depends on subscription status
  });
}
