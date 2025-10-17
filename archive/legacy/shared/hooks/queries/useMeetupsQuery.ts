import { useQuery } from '@tanstack/react-query';
import type { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/shared/integrations/supabase/client';
import { SafeCast } from '@/utils/typeValidation';

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export const useMeetupsQuery = (page: number, itemsPerPage: number) => {
  return useQuery({
    queryKey: ['meetups', page, itemsPerPage],
    queryFn: async (): Promise<PagedResult<Tables<'events'>>> => {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const [{ count }, { data, error }] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*').order('date', { ascending: true }).range(from, to),
      ]);

      if (error) throw error;
      return { items: SafeCast.toArray(data, []), total: count ?? 0 };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
