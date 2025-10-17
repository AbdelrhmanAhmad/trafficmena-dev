import { supabase } from '@/shared/integrations/supabase/client';
import { AppErrorHandler } from '@/shared/utils/errorHandling';
import type { BookingRequest, BookingResponse, Event, EventWithAttendees } from '../types';

/**
 * Event Booking Service
 * Handles all event booking related operations
 */
export class EventBookingService {
  private static instance: EventBookingService;

  static getInstance(): EventBookingService {
    if (!EventBookingService.instance) {
      EventBookingService.instance = new EventBookingService();
    }
    return EventBookingService.instance;
  }

  /**
   * Book a user for an event
   * SECURITY FIX: Get user_id from authenticated context to prevent IDOR attacks
   */
  async bookEvent(booking: BookingRequest): Promise<BookingResponse> {
    try {
      // SECURITY: Get authenticated user - prevent IDOR vulnerability
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          message: 'Authentication required to book events',
        };
      }

      // First check if event exists and has available spots
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, max_attendees')
        .eq('id', booking.event_id)
        .single();

      if (eventError || !event) {
        return {
          success: false,
          message: 'Event not found',
        };
      }

      // Check current attendee count if there's a max limit
      if (event.max_attendees) {
        const { count, error: countError } = await supabase
          .from('event_attendees')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', booking.event_id);

        if (countError) {
          return {
            success: false,
            message: 'Failed to check event availability',
          };
        }

        if (count && count >= event.max_attendees) {
          return {
            success: false,
            message: 'Event is fully booked',
          };
        }
      }

      // SECURITY: Use authenticated user_id instead of request parameter
      const secureBooking = {
        event_id: booking.event_id,
        user_id: user.id, // Always use authenticated user's ID
      };

      // Attempt to create the booking
      const { data, error } = await supabase
        .from('event_attendees')
        .insert(secureBooking)
        .select()
        .single();

      if (error) {
        // Handle duplicate booking
        if (error.code === '23505') {
          return {
            success: false,
            message: 'You are already registered for this event',
          };
        }

        return {
          success: false,
          message: 'Failed to register for event',
        };
      }

      return {
        success: true,
        message: 'Successfully registered for event',
        booking: data,
      };
    } catch (error) {
      AppErrorHandler.handleSupabaseError(error);
      return {
        success: false,
        message: 'An unexpected error occurred',
      };
    }
  }

  /**
   * Cancel an event booking
   */
  async cancelBooking(eventId: string, userId: string): Promise<BookingResponse> {
    try {
      // Get current authenticated user
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !currentUser) {
        console.warn('Unauthorized booking cancellation attempt:', {
          eventId,
          targetUserId: userId,
        });
        return {
          success: false,
          message: 'Authentication required to cancel booking',
        };
      }

      // Check if current user is authorized to cancel this booking
      const isOwnBooking = currentUser.id === userId;
      let isAdmin = false;

      // Check admin status if not own booking
      if (!isOwnBooking) {
        const { data: adminData, error: adminError } = await supabase.rpc('is_admin');

        if (adminError) {
          AppErrorHandler.handleSupabaseError(adminError);
          // For security, deny access if we can't verify admin status
          console.warn('Security violation - admin status check failed:', {
            currentUserId: currentUser.id,
            targetUserId: userId,
            eventId,
          });
          return {
            success: false,
            message: 'Authorization check failed',
          };
        }

        isAdmin = Boolean(adminData);
      }

      // Authorize the cancellation
      if (!isOwnBooking && !isAdmin) {
        console.warn('Security violation - unauthorized booking cancellation attempt:', {
          currentUserId: currentUser.id,
          targetUserId: userId,
          eventId,
          isAdmin,
        });
        return {
          success: false,
          message: 'Unauthorized: You can only cancel your own bookings',
        };
      }

      // Proceed with cancellation if authorized
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) {
        AppErrorHandler.handleSupabaseError(error);
        return {
          success: false,
          message: 'Failed to cancel booking',
        };
      }

      // Log successful cancellation for audit trail (development only)
      if (import.meta.env.DEV) {
        console.log('Booking cancelled successfully:', {
          eventId,
          cancelledUserId: userId,
          cancelledByUserId: currentUser.id,
          isAdmin: isAdmin,
          isOwnBooking: isOwnBooking,
        });
      }

      return {
        success: true,
        message: 'Booking cancelled successfully',
      };
    } catch (error) {
      AppErrorHandler.handleSupabaseError(error);
      return {
        success: false,
        message: 'An unexpected error occurred',
      };
    }
  }

  /**
   * Check if user is attending an event
   */
  async isUserAttending(eventId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        AppErrorHandler.handleSupabaseError(error);
        return false;
      }

      return !!data;
    } catch (error) {
      AppErrorHandler.handleSupabaseError(error);
      return false;
    }
  }

  /**
   * Get attendee count for an event
   */
  async getEventAttendeeCount(eventId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('event_attendees')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      if (error) {
        AppErrorHandler.handleSupabaseError(error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      AppErrorHandler.handleSupabaseError(error);
      return 0;
    }
  }

  /**
   * Get event with attendee information
   */
  async getEventWithAttendees(
    eventId: string,
    userId?: string,
  ): Promise<EventWithAttendees | null> {
    try {
      // Fetch event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return null;
      }

      // Get attendee count
      const attendeeCount = await this.getEventAttendeeCount(eventId);

      // Check if user is attending (if userId provided)
      let isUserAttending = false;
      if (userId) {
        isUserAttending = await this.isUserAttending(eventId, userId);
      }

      return {
        ...event,
        attendeeCount,
        isUserAttending,
      };
    } catch (error) {
      AppErrorHandler.handleSupabaseError(error);
      return null;
    }
  }

  /**
   * Get attendees for multiple events (for admin dashboard)
   */
  async getAttendeeCountsForEvents(eventIds: string[]): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('event_id')
        .in('event_id', eventIds);

      if (error) {
        AppErrorHandler.handleSupabaseError(error);
        return {};
      }

      // Count attendees per event
      const counts = data.reduce(
        (acc, attendee) => {
          acc[attendee.event_id] = (acc[attendee.event_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return counts;
    } catch (error) {
      AppErrorHandler.handleSupabaseError(error);
      return {};
    }
  }

  /**
   * Get user's upcoming events
   */
  async getUserUpcomingEvents(userId: string): Promise<Event[]> {
    try {
      // First get the event IDs that the user is attending
      const { data: attendeeData, error: attendeeError } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('user_id', userId);

      if (attendeeError) {
        AppErrorHandler.handleSupabaseError(attendeeError);
        return [];
      }

      if (!attendeeData || attendeeData.length === 0) {
        return [];
      }

      const eventIds = attendeeData.map((attendance) => attendance.event_id);

      // Now get the actual event details
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .gte('date', new Date().toISOString()) // Only upcoming events
        .order('date', { ascending: true });

      if (eventsError) {
        AppErrorHandler.handleSupabaseError(eventsError);
        return [];
      }

      return eventsData || [];
    } catch (error) {
      AppErrorHandler.handleSupabaseError(error);
      return [];
    }
  }
}
