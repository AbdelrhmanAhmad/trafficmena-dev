import { format } from 'date-fns';
import { ArrowRight, Calendar, CheckCircle, Download, MapPin, Users } from 'lucide-react';
import type React from 'react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEventBooking } from '@/features/events/hooks/useEventBooking';
import { useEvent } from '@/features/events/hooks/useEvents';
import DataLoader from '@/shared/components/DataLoader';
import Layout from '@/shared/components/layout/Layout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useAuth } from '@/shared/context/AuthContext';
import { clearPendingEventContext } from '@/shared/utils/eventRedirectUtils';

const ThankYouEvent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get event details and booking functionality
  const { data: event, isLoading, error } = useEvent(id);
  const { bookEvent } = useEventBooking();

  // Auto-register user for the event when component loads
  useEffect(() => {
    if (user && id && event && !event.attending) {
      bookEvent({
        event_id: id,
      });
    }

    // Clear the pending event context since we've processed it
    clearPendingEventContext();
  }, [user, id, event, bookEvent]);

  // Handle calendar file generation
  const generateCalendarFile = () => {
    if (!event) return;

    const startDate = new Date(event.date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

    const formatDate = (date: Date) => `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;

    const calendarData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TrafficMENA//Event//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@trafficmena.com`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.location || ''}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([calendarData], {
      type: 'text/calendar;charset=utf-8',
    });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    link.click();
  };

  const formatEventDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatEventTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch {
      return 'Time TBD';
    }
  };

  return (
    <Layout>
      <DataLoader
        loading={isLoading}
        error={error ? 'Failed to load event details' : null}
        loadingText="Loading event details..."
        onRetry={() => window.location.reload()}
      >
        {event && (
          <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              {/* Success Header */}
              <div className="mb-8 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="mb-4 text-4xl font-bold text-gray-900">🎉 You're All Set!</h1>
                <p className="mb-2 text-xl text-gray-600">
                  Welcome to TrafficMENA Hub, {user?.user_metadata?.first_name || 'there'}!
                </p>
                <p className="text-lg text-gray-600">
                  You've successfully registered for the event below.
                </p>
              </div>

              {/* Event Details Card */}
              <Card className="mb-8 border-green-200 bg-green-50">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Event Registration Confirmed</span>
                  </div>
                  <CardTitle className="text-2xl text-gray-900">{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-3 text-gray-700">
                      <Calendar className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="font-medium">{formatEventDate(event.date)}</div>
                        <div className="text-sm text-gray-500">{formatEventTime(event.date)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-700">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="font-medium">{event.location || 'Location TBD'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-700">
                      <Users className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="font-medium">
                          {event.attendee_count} / {event.max_attendees || '∞'} attendees
                        </div>
                      </div>
                    </div>
                  </div>

                  {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {event.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="mb-8 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Button
                    onClick={generateCalendarFile}
                    variant="outline"
                    className="flex h-12 items-center gap-2"
                  >
                    <Download className="h-5 w-5" />
                    Add to Calendar
                  </Button>

                  <Button
                    onClick={() => navigate(`/meetups/${id}`)}
                    variant="outline"
                    className="flex h-12 items-center gap-2"
                  >
                    <Calendar className="h-5 w-5" />
                    View Event Details
                  </Button>
                </div>

                <Button
                  onClick={() => navigate('/dashboard')}
                  className="flex h-12 w-full items-center justify-center gap-2"
                >
                  Go to My Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Next Steps */}
              <Card>
                <CardHeader>
                  <CardTitle>What happens next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-medium text-primary">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Check your email</h4>
                      <p className="text-sm text-gray-600">
                        We'll send you event reminders and important updates.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-medium text-primary">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Add to your calendar</h4>
                      <p className="text-sm text-gray-600">
                        Use the "Add to Calendar" button above to never miss the event.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-medium text-primary">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Prepare for the event</h4>
                      <p className="text-sm text-gray-600">
                        Review the event details and agenda to get the most out of your experience.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-medium text-primary">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Join our community</h4>
                      <p className="text-sm text-gray-600">
                        Explore more events, resources, and connect with fellow marketers on your
                        dashboard.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DataLoader>
    </Layout>
  );
};

export default ThankYouEvent;
