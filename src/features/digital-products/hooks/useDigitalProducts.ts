import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDigitalProductFile,
  createDigitalProduct,
  deleteDigitalProduct,
  fetchAdminDigitalProduct,
  fetchAdminDigitalProducts,
  fetchDigitalProductStore,
  fetchDigitalProductStoreDetail,
  removeDigitalProductFile,
  updateDigitalProduct,
  updateDigitalProductFile,
} from '@/app/api/digitalProducts';
import { useToast } from '@/shared/hooks/custom/use-toast';

export function useAdminDigitalProducts() {
  return useQuery({
    queryKey: ['digital-products', 'admin'],
    queryFn: fetchAdminDigitalProducts,
    staleTime: 60_000,
  });
}

export function useAdminDigitalProductDetail(id: string) {
  return useQuery({
    queryKey: ['digital-products', 'admin', id],
    queryFn: () => fetchAdminDigitalProduct(id),
    enabled: !!id,
  });
}

export function useDigitalProductStore(filter: 'all' | 'mine' = 'all') {
  return useQuery({
    queryKey: ['digital-products', 'store', filter],
    queryFn: () => fetchDigitalProductStore(filter),
    staleTime: 60_000,
  });
}

export function useDigitalProductStoreDetail(id: string) {
  return useQuery({
    queryKey: ['digital-products', 'store', id],
    queryFn: () => fetchDigitalProductStoreDetail(id),
    enabled: !!id,
  });
}

export function useCreateDigitalProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createDigitalProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-products'] });
      toast({ title: 'Product created', description: 'Digital product saved successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateDigitalProduct(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: Parameters<typeof updateDigitalProduct>[1]) =>
      updateDigitalProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-products'] });
      toast({ title: 'Saved', description: 'Product updated.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteDigitalProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteDigitalProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-products'] });
      toast({ title: 'Deleted', description: 'Product removed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAddDigitalProductFile(productId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: Parameters<typeof addDigitalProductFile>[1]) =>
      addDigitalProductFile(productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-products', 'admin', productId] });
      queryClient.invalidateQueries({ queryKey: ['digital-products'] });
      toast({ title: 'File item added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateDigitalProductFile(productId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      fileId,
      payload,
    }: {
      fileId: string;
      payload: Parameters<typeof updateDigitalProductFile>[2];
    }) => updateDigitalProductFile(productId, fileId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-products', 'admin', productId] });
      queryClient.invalidateQueries({ queryKey: ['digital-products'] });
      toast({ title: 'File item updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveDigitalProductFile(productId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (fileId: string) => removeDigitalProductFile(productId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-products', 'admin', productId] });
      queryClient.invalidateQueries({ queryKey: ['digital-products'] });
      toast({ title: 'File removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
