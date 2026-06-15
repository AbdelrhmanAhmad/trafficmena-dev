import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle,
  Clock,
  Crown,
  Download,
  ExternalLink,
  MapPin,
  Users,
  Video,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCurrentSubscription } from '@/app/hooks/useSubscriptions';
import { useEventBooking } from '@/features/events/hooks/useEventBooking';
import { useEvent } from '@/features/events/hooks/useEvents';
import { trackAddToCalendar } from '@/lib/analytics/events';
import DataLoader from '@/shared/components/DataLoader';
import Layout from '@/shared/components/layout/Layout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useAuth } from '@/shared/context/AuthContext';
import { isValidLocationUrl } from '@/shared/hooks/custom/useLocationVisibility';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';
import { formatDateWithDay, formatShortDate, formatTime } from '@/shared/utils/dateUtils';
import { clearPendingEventContext } from '@/shared/utils/eventRedirectUtils';

const ThankYouEvent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { canAccessSubscriptionPages } = useRolePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPaidFlow = searchParams.get('paid') === '1';

  const { data: event, isLoading, error } = useEvent(id);
  const { bookEvent } = useEventBooking();
  const { data: subscription } = useCurrentSubscription({ enabled: Boolean(user) });

  const isOnlineEvent = Boolean(event?.meeting_link) && !event?.location;
  const hasActiveSubscription = subscription?.status === 'active';
  const showMembershipCard = hasActiveSubscription || canAccessSubscriptionPages;
  const requiresPayment =
    (event?.price_in_cents ?? 0) > 0 && !(hasActiveSubscription && isOnlineEvent);

  // Auto-register user for the event when arriving from post-signup flow
  useEffect(() => {
    if (user && id && event && !event.attending && !requiresPayment) {
      bookEvent({ event_id: id });
    }
    clearPendingEventContext();
  }, [user, id, event, bookEvent, requiresPayment]);

  // Generate Google Calendar URL
  const googleCalendarUrl = useMemo(() => {
    if (!event) return null;

    const startDate = new Date(event.date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    // Format: YYYYMMDDTHHMMSSZ
    const formatGoogleDate = (date: Date) =>
      date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
      details: event.description || `TrafficMENA Event: ${event.title}`,
      location: event.location || (event.meeting_link ? 'Online Event' : ''),
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [event]);

  // Generate ICS file for Apple Calendar / Outlook
  const downloadIcsFile = () => {
    if (!event) return;
    trackAddToCalendar({ itemId: event.id, itemName: event.title, calendarType: 'ics_download' });

    const startDate = new Date(event.date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const formatIcsDate = (date: Date) =>
      `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;

    // Escape special characters for ICS format
    const escapeIcs = (text: string) =>
      text.replace(/[\\;,]/g, (match) => `\\${match}`).replace(/\n/g, '\\n');

    const calendarData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TrafficMENA//Event//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${event.id}@trafficmena.com`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${escapeIcs(event.title)}`,
      `DESCRIPTION:${escapeIcs(event.description || '')}`,
      `LOCATION:${escapeIcs(event.location || '')}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([calendarData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    link.click();
    window.URL.revokeObjectURL(link.href);
  };

  const locationLabel = event?.location || (isOnlineEvent ? 'Online Event' : 'Location TBD');
  const eventImageUrl =
    event?.image_url && event.image_url.trim().length > 0
      ? event.image_url.trim()
      : '/placeholder.svg';

  return (
    <Layout>
      <DataLoader
        loading={isLoading}
        error={error ? 'Failed to load event details' : null}
        loadingText="Loading event details..."
        onRetry={() => window.location.reload()}
      >
        {event && (
          <div className="relative isolate min-h-screen overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
            {/* Gradient background */}
            <div className="pointer-events-none absolute -left-[45vw] top-[-25vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/60 via-[#f4fff9]/40 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute -right-[48vw] top-[35vh] -z-10 h-[55vh] w-[80vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[90px]" />

            <div className="mx-auto max-w-3xl">
              {/* Success Header */}
              <div className="mb-8 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62]/20 to-[#29cf9f]/20 ring-4 ring-[#05ef62]/30">
                  <CheckCircle className="h-10 w-10 text-[#05ef62]" />
                </div>
                <h1 className="mb-4 text-4xl font-bold text-gray-900">You're All Set!</h1>
                <p className="mb-2 text-xl text-gray-600">
                  Welcome
                  {user?.user_metadata?.first_name ? `, ${user.user_metadata.first_name}` : ''}!
                </p>
                <p className="text-lg text-gray-600">
                  {isPaidFlow
                    ? 'Payment confirmed. Your spot is secured for the event below.'
                    : "You've successfully registered for the event below."}
                </p>

                {isPaidFlow && (
                  <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                    <BadgeCheck className="h-4 w-4" />
                    Payment successful · Registration confirmed
                  </div>
                )}
              </div>

              {/* Event Details Card */}
              <Card className="mb-8 overflow-hidden border-[#05ef62]/30 shadow-lg">
                {/* Event Image */}
                <div className="relative h-48 w-full overflow-hidden bg-neutral-100">
                  <img
                    src={eventImageUrl}
                    alt={`${event.title} cover`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-[#05ef62] text-[#101010] hover:bg-[#05ef62]/90">
                        {event.event_type}
                      </Badge>
                      {event.tags?.[0] && (
                        <Badge variant="secondary" className="bg-white/90 text-neutral-800">
                          {event.tags[0]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <CardHeader className="bg-gradient-to-r from-[#05ef62]/10 to-[#29cf9f]/10">
                  <div className="mb-2 flex items-center gap-2 text-[#059640]">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Event Registration Confirmed</span>
                  </div>
                  <CardTitle className="text-2xl text-gray-900">{event.title}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                      <Calendar className="h-5 w-5 text-[#05ef62]" />
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Date
                        </div>
                        <div className="font-semibold text-neutral-900">
                          {formatDateWithDay(event.date)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                      <Clock className="h-5 w-5 text-[#05ef62]" />
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Time
                        </div>
                        <div className="font-semibold text-neutral-900">
                          {formatTime(event.date)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                      {isOnlineEvent ? (
                        <Video className="h-5 w-5 text-[#05ef62]" />
                      ) : (
                        <MapPin className="h-5 w-5 text-[#05ef62]" />
                      )}
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Location
                        </div>
                        <div className="font-semibold text-neutral-900">{locationLabel}</div>
                        {event.location_url && isValidLocationUrl(event.location_url) && (
                          <a
                            href={event.location_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#05ef62] hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View on Map
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                      <Users className="h-5 w-5 text-[#05ef62]" />
                      <div className="font-semibold text-neutral-900">
                        {event.max_attendees && event.attendee_count >= event.max_attendees
                          ? 'Sold Out'
                          : 'Limited Spots'}
                      </div>
                    </div>
                  </div>

                  {/* Meeting Link for Online Events */}
                  {event.meeting_link && (
                    <div className="rounded-xl border border-[#05ef62]/30 bg-[#05ef62]/5 p-4">
                      <div className="flex items-center gap-2 text-[#059640]">
                        <Video className="h-5 w-5" />
                        <span className="font-semibold">Meeting Link Available</span>
                      </div>
                      <p className="mt-2 text-sm text-neutral-600">
                        The meeting link will be visible on the event page when the event is about
                        to start. You can also access it from your dashboard.
                      </p>
                    </div>
                  )}

                  {event.tags && event.tags.length > 1 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {event.tags.slice(1).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment + Membership Summary */}
              {(isPaidFlow || showMembershipCard) && (
                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {isPaidFlow && (
                    <Card
                      className={
                        !showMembershipCard
                          ? 'border-emerald-200 bg-emerald-50/60 md:col-span-2'
                          : 'border-emerald-200 bg-emerald-50/60'
                      }
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-emerald-900">
                          <BadgeCheck className="h-5 w-5" />
                          Payment Confirmed
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-emerald-900/80">
                        <p>Your payment was processed successfully.</p>
                        <p>Your seat is reserved and your registration is active.</p>
                        <p>We will email you a receipt and event updates.</p>
                      </CardContent>
                    </Card>
                  )}

                  {showMembershipCard && (
                    <Card className={isPaidFlow ? '' : 'md:col-span-2'}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-neutral-900">
                          <Crown className="h-5 w-5 text-[#05ef62]" />
                          Membership Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-neutral-700">
                        {hasActiveSubscription ? (
                          <>
                            <div className="inline-flex items-center gap-2 rounded-full bg-[#05ef62]/10 px-3 py-1 text-sm font-semibold text-[#059640]">
                              Active Subscription
                            </div>
                            <p>
                              Your subscription is active
                              {subscription?.endsAt
                                ? ` until ${formatShortDate(subscription.endsAt)}.`
                                : '.'}
                            </p>
                            <p>
                              You have full library access, member discounts, and priority support.
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">
                              No Active Subscription
                            </div>
                            <p>
                              Upgrade to unlock full library access, discounted events, and
                              member-only resources.
                            </p>
                            <Button
                              onClick={() => navigate('/subscribe')}
                              className="w-full bg-neutral-900 text-white hover:bg-neutral-800"
                            >
                              Explore Subscription
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Calendar Action Buttons */}
              <div className="mb-8 space-y-4">
                <p className="text-center text-sm font-medium text-neutral-600">
                  Add this event to your calendar
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Button
                    asChild
                    variant="outline"
                    className="flex h-12 items-center gap-2 border-neutral-300 hover:bg-neutral-50"
                  >
                    <a
                      href={googleCalendarUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        event &&
                        trackAddToCalendar({
                          itemId: event.id,
                          itemName: event.title,
                          calendarType: 'google_calendar',
                        })
                      }
                    >
                      <ExternalLink className="h-5 w-5" />
                      Add to Google Calendar
                    </a>
                  </Button>

                  <Button
                    onClick={downloadIcsFile}
                    variant="outline"
                    className="flex h-12 items-center gap-2 border-neutral-300 hover:bg-neutral-50"
                  >
                    <Download className="h-5 w-5" />
                    Download .ics File
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Button
                    onClick={() => navigate(`/meetups/${id}`)}
                    variant="outline"
                    className="flex h-12 items-center gap-2 border-neutral-300 hover:bg-neutral-50"
                  >
                    <Calendar className="h-5 w-5" />
                    View Event Details
                  </Button>

                  <Button
                    onClick={() => navigate('/dashboard')}
                    className="flex h-12 items-center justify-center gap-2 bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010] hover:brightness-95"
                  >
                    Go to Dashboard
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Next Steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">What happens next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#05ef62]/20">
                      <span className="text-sm font-semibold text-[#059640]">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Check your email</h4>
                      <p className="text-sm text-gray-600">
                        We'll send you event reminders and important updates.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#05ef62]/20">
                      <span className="text-sm font-semibold text-[#059640]">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Save the date</h4>
                      <p className="text-sm text-gray-600">
                        Use the calendar buttons above to add this event to your calendar.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#05ef62]/20">
                      <span className="text-sm font-semibold text-[#059640]">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Prepare for the event</h4>
                      <p className="text-sm text-gray-600">
                        Review the event details to get the most out of your experience.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#05ef62]/20">
                      <span className="text-sm font-semibold text-[#059640]">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Explore more</h4>
                      <p className="text-sm text-gray-600">
                        Check out other events, resources, and connect with fellow marketers on your
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
