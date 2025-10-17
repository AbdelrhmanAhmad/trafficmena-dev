import { format } from 'date-fns';
import { Calendar, CheckCircle, Clock, MapPin, Users, Video } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DataLoader from '@/shared/components/DataLoader';
import Layout from '@/shared/components/layout/Layout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useAuth } from '@/shared/context/AuthContext';
import { useIsAdmin } from '@/shared/hooks/custom/useIsAdmin';
import {
  clearPendingEventContext,
  storePendingEventContext,
} from '@/shared/utils/eventRedirectUtils';
import { useEventBooking } from '../hooks/useEventBooking';
import { useEvent } from '../hooks/useEvents';

const formatEventDate = (value: string) => {
  try {
    return format(new Date(value), 'MMMM d, yyyy');
  } catch {
    return value;
  }
};

const formatEventTime = (value: string) => {
  try {
    return format(new Date(value), 'h:mm a');
  } catch {
    return 'Time TBD';
  }
};

const trustedMeetingDomains = [
  'zoom.us',
  'zoom.com',
  'meet.google.com',
  'teams.microsoft.com',
  'webex.com',
  'gotomeeting.com',
  'jitsi.org',
];

const validateMeetingUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Meeting links must use HTTPS.' };
    }

    const hostname = parsed.hostname.toLowerCase();
    const isTrusted = trustedMeetingDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );

    if (!isTrusted) {
      return {
        isValid: false,
        error: 'Meeting links must be hosted on an approved provider like Zoom or Google Meet.',
      };
    }

    return { isValid: true, validatedUrl: url };
  } catch {
    return { isValid: false, error: 'Invalid meeting link.' };
  }
};

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { data: event, isLoading, error } = useEvent(id);
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { bookEvent, cancelBooking, isBooking, isCancelling } = useEventBooking();

  useEffect(() => {
    if (!id || !event) return;
    const registeredParam = searchParams.get('registered');
    if (registeredParam === 'true' && !event.attending) {
      bookEvent({ event_id: id });
      clearPendingEventContext();
      const next = new URLSearchParams(searchParams);
      next.delete('registered');
      navigate(`/meetups/${id}?${next.toString()}`, { replace: true });
    }
  }, [bookEvent, event, id, navigate, searchParams]);

  const attendeeCountLabel = useMemo(() => {
    if (!event) return '0 attendees';
    if (event.max_attendees) {
      return `${event.attendee_count} / ${event.max_attendees} attending`;
    }
    return `${event.attendee_count} attendees`;
  }, [event]);

  const showMeetingLink = useMemo(() => {
    if (!event?.meeting_link || adminLoading) return false;
    if (isAdmin) return true;
    return Boolean(event.attending);
  }, [adminLoading, event?.attending, event?.meeting_link, isAdmin]);

  const handleRegister = () => {
    if (!id || !event) return;

    if (!user) {
      const stored = storePendingEventContext({
        eventId: id,
        eventTitle: event.title,
        eventDate: event.date,
        redirectUrl: `/meetups/${id}`,
      });

      if (!stored) {
        console.warn('Failed to capture event context prior to signup redirect.');
      }

      navigate('/signup?source=event');
      return;
    }

    bookEvent({ event_id: id });
  };

  const handleCancel = () => {
    if (!id) return;
    cancelBooking({ eventId: id });
  };

  return (
    <Layout>
      <DataLoader
        loading={isLoading}
        error={error ? 'Unable to load this event right now.' : null}
        loadingText="Loading event details..."
      >
        {event && (
          <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-8">
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Badge className="mb-4 inline-flex">{event.event_type}</Badge>
                    <h1 className="text-4xl font-bold text-primary">{event.title}</h1>
                    <p className="mt-4 text-base text-muted-foreground">
                      {event.description ?? 'Event description coming soon.'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={event.attending ? handleCancel : handleRegister}
                      disabled={isBooking || isCancelling}
                    >
                      {event.attending ? 'Cancel Registration' : 'Register Now'}
                    </Button>
                    {event.attending && (
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        Registered for this event
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatEventDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatEventTime(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location ?? 'Location coming soon'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{attendeeCountLabel}</span>
                  </div>
                </div>
              </div>

              {event.meeting_link && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      Meeting Link
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {showMeetingLink ? (
                      (() => {
                        const validation = validateMeetingUrl(event.meeting_link);
                        if (!validation.isValid) {
                          return <p className="text-sm text-destructive">{validation.error}</p>;
                        }
                        return (
                          <a
                            href={validation.validatedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                          >
                            Join the session
                          </a>
                        );
                      })()
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        The meeting link is available once you register.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {event.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Topics Covered</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </DataLoader>
    </Layout>
  );
};

export default EventDetail;
