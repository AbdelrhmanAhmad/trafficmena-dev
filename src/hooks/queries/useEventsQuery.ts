import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface EventListItem {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  max_attendees: number | null;
  image_url: string | null;
  tags: string[] | null;
  event_type: string;
}

export const useEventsQuery = (page: number, itemsPerPage: number) => {
  return useQuery({
    queryKey: ["events", page, itemsPerPage],
    queryFn: async (): Promise<PagedResult<EventListItem>> => {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const [{ count }, { data, error }] = await Promise.all([
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase
          .from("events")
          .select(
            "id, title, description, date, location, max_attendees, image_url, tags, event_type"
          )
          .order("date", { ascending: true })
          .range(from, to),
      ]);

      if (error) throw error;
      return { items: (data as EventListItem[]) ?? [], total: count ?? 0 };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};