import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface ProductListItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  created_at: string;
}

export const useProductsQuery = (page: number, itemsPerPage: number) => {
  return useQuery({
    queryKey: ["products", page, itemsPerPage],
    queryFn: async (): Promise<PagedResult<ProductListItem>> => {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const [{ count }, { data, error }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase
          .from("products")
          .select("id, name, description, price, created_at")
          .order("created_at", { ascending: false })
          .range(from, to),
      ]);

      if (error) throw error;
      return { items: (data as ProductListItem[]) ?? [], total: count ?? 0 };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
