import { supabase } from '@/shared/integrations/supabase/client';
import { AppErrorHandler } from '@/shared/utils/errorHandling';
import { SafeCast } from '@/utils/typeValidation';
import type {
  Event,
  EventFilters,
  EventFormData,
  EventListItem,
  EventStatistics,
  PagedResult,
} from '../types';

/**
 * Event Service
 * Handles all event CRUD operations and queries
 */
export class EventService {
  private static instance: EventService;

  static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  /**
   * Get paginated events for public listing
   */
  async getEvents(
    page: number,
    itemsPerPage: number,
    filters?: EventFilters,
  ): Promise<PagedResult<EventListItem>> {
    try {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('events')
        .select(
          'id, title, description, date, location, max_attendees, image_url, tags, event_type',
        );

      // Apply filters
      if (filters) {
        if (filters.event_type) {
          query = query.eq('event_type', filters.event_type);
        }

        if (filters.upcoming_only) {
          query = query.gte('date', new Date().toISOString());
        }

        if (filters.date_range) {
          query = query.gte('date', filters.date_range.start).lte('date', filters.date_range.end);
        }

        if (filters.tags && filters.tags.length > 0) {
          query = query.contains('tags', filters.tags);
        }
      }

      const [{ count }, { data, error }] = await Promise.all([
        query.select('*', { count: 'exact', head: true }),
        query.order('date', { ascending: true }).range(from, to),
      ]);

      if (error) throw error;

      return {
        items: SafeCast.toArray(data, []),
        total: count ?? 0,
      };
    } catch (error) {
      const appError = AppErrorHandler.handleSupabaseError(error);
      throw appError;
    }
  }

  /**
   * Get a single event by ID
   */
  async getEventById(id: string): Promise<Event | null> {
    try {
      const { data, error } = await supabase.from('events').select('*').eq('id', id).single();

      if (error) {
        AppErrorHandler.handleSupabaseError(error);
        return null;
      }

      return data as Event;
    } catch (error) {
      AppErrorHandler.handleSupabaseError(error);
      return null;
    }
  }

  /**
   * Create a new event (admin only)
   */
  async createEvent(eventData: EventFormData): Promise<Event | null> {
    try {
      const { data, error } = await supabase.from('events').insert(eventData).select().single();

      if (error) {
        throw AppErrorHandler.handleSupabaseError(error);
      }

      return data as Event;
    } catch (error) {
      throw AppErrorHandler.handleSupabaseError(error);
    }
  }

  /**
   * Update an existing event (admin only)
   */
  async updateEvent(id: string, eventData: Partial<EventFormData>): Promise<Event | null> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(eventData as any)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw AppErrorHandler.handleSupabaseError(error);
      }

      return data as Event;
    } catch (error) {
      throw AppErrorHandler.handleSupabaseError(error);
    }
  }

  /**
   * Delete an event (admin only)
   */
  async deleteEvent(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);

      if (error) {
        throw AppErrorHandler.handleSupabaseError(error);
      }

      return true;
    } catch (error) {
      throw AppErrorHandler.handleSupabaseError(error);
    }
  }

  /**
   * Get all events for admin dashboard
   */
  async getAllEventsForAdmin(): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      return SafeCast.toArray(data, []);
    } catch (error) {
      throw AppErrorHandler.handleSupabaseError(error);
    }
  }

  /**
   * Get event statistics for admin dashboard
   */
  async getEventStatistics(): Promise<EventStatistics> {
    try {
      const results = await Promise.allSettled([
        supabase.from('events').select('id, date'),
        supabase.from('event_attendees').select('event_id'),
      ]);

      // Use improved error handling
      const eventsResult = AppErrorHandler.extractPromiseResult(
        results[0],
        'Load Events for Statistics',
      );
      const attendeesResult = AppErrorHandler.extractPromiseResult(
        results[1],
        'Load Event Attendees for Statistics',
      );

      let totalEvents = 0;
      let upcomingEvents = 0;
      let pastEvents = 0;
      let totalAttendees = 0;

      if (eventsResult.success && eventsResult.data) {
        const events = eventsResult.data || [];
        totalEvents = events.length;

        const now = new Date();
        upcomingEvents = events.filter((event) => new Date(event.date) > now).length;
        pastEvents = events.filter((event) => new Date(event.date) <= now).length;
      } else if (eventsResult.error) {
        AppErrorHandler.handleSupabaseError(eventsResult.error);
      }

      if (attendeesResult.success && attendeesResult.data) {
        totalAttendees = attendeesResult.data?.length || 0;
      } else if (attendeesResult.error) {
        AppErrorHandler.handleSupabaseError(attendeesResult.error);
      }

      return {
        totalEvents,
        upcomingEvents,
        pastEvents,
        totalAttendees,
        averageAttendeesPerEvent:
          totalEvents > 0 ? Math.round((totalAttendees / totalEvents) * 100) / 100 : 0,
      };
    } catch (error) {
      AppErrorHandler.handleSupabaseError(error);
      return {
        totalEvents: 0,
        upcomingEvents: 0,
        pastEvents: 0,
        totalAttendees: 0,
        averageAttendeesPerEvent: 0,
      };
    }
  }

  /**
   * Get events by type
   */
  async getEventsByType(eventType: string): Promise<EventListItem[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(
          'id, title, description, date, location, max_attendees, image_url, tags, event_type',
        )
        .eq('event_type', eventType)
        .order('date', { ascending: true });

      if (error) throw error;

      return SafeCast.toArray(data, []);
    } catch (error) {
      AppErrorHandler.handleSupabaseError(error);
      return [];
    }
  }

  /**
   * Get upcoming events (for dashboard)
   */
  async getUpcomingEvents(limit: number = 5): Promise<EventListItem[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(
          'id, title, description, date, location, max_attendees, image_url, tags, event_type',
        )
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return SafeCast.toArray(data, []);
    } catch (error) {
      AppErrorHandler.handleSupabaseError(error);
      return [];
    }
  }
}
