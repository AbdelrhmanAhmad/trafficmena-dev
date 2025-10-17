import { useQuery } from '@tanstack/react-query';

type AdminAttendeeRecord = {
  userId: string;
  registeredAt: string;
  email?: string | null;
  name?: string | null;
};

/**
 * Placeholder hook while invitation + attendee admin APIs are under construction.
 * Returns an empty list so admin pages render without Supabase dependencies.
 */
export const useEventAttendees = (eventId: string | undefined) => {
  return useQuery<AdminAttendeeRecord[]>({
    queryKey: ['event-attendees', eventId],
    queryFn: async () => [],
    enabled: Boolean(eventId),
    staleTime: 2 * 60 * 1000,
  });
};
