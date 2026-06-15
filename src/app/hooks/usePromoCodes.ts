import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type CreatePromoCodePayload,
  createPromoCode,
  deletePromoCode,
  fetchPromoCode,
  fetchPromoCodes,
  type PromoCodeRecord,
  type UpdatePromoCodePayload,
  updatePromoCode,
} from '@/app/api/promoCodes';

const promoCodesKey = ['admin', 'promo-codes'];

export function usePromoCodes() {
  return useQuery<PromoCodeRecord[]>({
    queryKey: promoCodesKey,
    queryFn: fetchPromoCodes,
    staleTime: 60 * 1000,
  });
}

export function usePromoCode(id: string | undefined) {
  return useQuery<PromoCodeRecord>({
    queryKey: [...promoCodesKey, id],
    queryFn: () => {
      if (!id) throw new Error('Promo code ID required');
      return fetchPromoCode(id);
    },
    enabled: !!id,
  });
}

export function useCreatePromoCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePromoCodePayload) => createPromoCode(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promoCodesKey });
    },
  });
}

export function useUpdatePromoCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePromoCodePayload }) =>
      updatePromoCode(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promoCodesKey });
    },
  });
}

export function useDeletePromoCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePromoCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promoCodesKey });
    },
  });
}
