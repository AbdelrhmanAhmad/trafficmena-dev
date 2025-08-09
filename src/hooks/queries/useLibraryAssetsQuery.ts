import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface LibraryAssetListItem {
  id: string;
  title: string;
  description: string | null;
  file_type: string;
  file_url: string | null;
  created_at: string;
  event_id: string | null;
}

export const useLibraryAssetsQuery = (page: number, itemsPerPage: number) => {
  return useQuery({
    queryKey: ["library_assets", page, itemsPerPage],
    queryFn: async (): Promise<PagedResult<LibraryAssetListItem>> => {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const [{ count }, { data, error }] = await Promise.all([
        supabase
          .from("library_assets")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("library_assets")
          .select("id, title, description, file_type, file_url, created_at, event_id")
          .order("created_at", { ascending: false })
          .range(from, to),
      ]);

      if (error) throw error;
      return { items: (data as LibraryAssetListItem[]) ?? [], total: count ?? 0 };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
