import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Calendar,
  CheckCircle,
  Crown,
  Download,
  ExternalLink,
  MapPin,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCurrentSubscription } from '@/app/hooks/useSubscriptions';
import { useBookTrack, usePublicTrack } from '@/features/tracks/hooks/useTracks';
import { resolveTrackCalendarAnalyticsEvent } from '@/lib/analytics/calendar';
import { trackAddToCalendar } from '@/lib/analytics/events';
import DataLoader from '@/shared/components/DataLoader';
import Layout from '@/shared/components/layout/Layout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useAuth } from '@/shared/context/AuthContext';
import { isValidLocationUrl } from '@/shared/hooks/custom/useLocationVisibility';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';
import { formatCardDate, formatDateWithDay, formatShortDate } from '@/shared/utils/dateUtils';
import { clearPendingTrackContext } from '@/shared/utils/trackRedirectUtils';

const ThankYouTrack: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { canAccessSubscriptionPages } = useRolePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPaidFlow = searchParams.get('paid') === '1';

  const { data, isLoading, error } = usePublicTrack(id || '', user?.id);
  const { mutate: bookTrack } = useBookTrack();
  const { data: subscription } = useCurrentSubscription({ enabled: Boolean(user) });

  const track = data?.track;
  const events = data?.events ?? [];
  const calendarAnalyticsEvent = useMemo(
    () => resolveTrackCalendarAnalyticsEvent(events),
    [events],
  );

  // Auto-book track for users arriving from post-signup flow
  useEffect(() => {
    const isFreeTrack = !track?.price_in_cents || track.price_in_cents <= 0;
    if (user && id && track && isFreeTrack && !track.user_has_booked) {
      bookTrack(id);
    }
    clearPendingTrackContext();
  }, [user, id, track, bookTrack]);

  // Generate ICS file for all track events
  const downloadIcsFile = () => {
    if (!track || events.length === 0) return;
    if (calendarAnalyticsEvent) {
      trackAddToCalendar({
        itemId: calendarAnalyticsEvent.itemId,
        itemName: calendarAnalyticsEvent.itemName,
        calendarType: 'ics_download',
      });
    }

    const calendarEvents = events.map((event) => {
      const startDate = new Date(event.date);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

      const formatIcsDate = (date: Date) =>
        `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;

      const escapeIcs = (text: string) =>
        text.replace(/[\\;,]/g, (match) => `\\${match}`).replace(/\n/g, '\\n');

      return [
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
      ].join('\r\n');
    });

    const calendarData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TrafficMENA//Track//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...calendarEvents,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([calendarData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${track.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    link.click();
    window.URL.revokeObjectURL(link.href);
  };

  // Generate Google Calendar URL for first session
  const googleCalendarUrl = useMemo(() => {
    if (!track || events.length === 0) return null;

    const firstEvent = events[0];
    const startDate = new Date(firstEvent.date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    const formatGoogleDate = (date: Date) =>
      date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: firstEvent.title,
      dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
      details: `Part of ${track.title} learning track.\n\n${firstEvent.description || ''}`,
      location: firstEvent.location || track.location || '',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [track, events]);

  const trackImageUrl =
    track?.image_url && track.image_url.trim().length > 0
      ? track.image_url.trim()
      : '/uploads/trafficmena-track.png';
  const hasActiveSubscription = subscription?.status === 'active';
  const showMembershipCard = hasActiveSubscription || canAccessSubscriptionPages;
  const firstEventDate = events.length > 0 ? new Date(events[0].date) : null;

  return (
    <Layout>
      <DataLoader
        loading={isLoading}
        error={error ? 'Failed to load track details' : null}
        loadingText="Loading track details..."
        onRetry={() => window.location.reload()}
      >
        {track && (
          <div className="relative isolate min-h-screen overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
            {/* Gradient background */}
            <div className="pointer-events-none absolute -left-[45vw] top-[-25vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-purple-100/60 via-indigo-50/40 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute -right-[48vw] top-[35vh] -z-10 h-[55vh] w-[80vw] rounded-full bg-gradient-to-tr from-purple-200/25 via-indigo-100/20 to-transparent blur-[90px]" />

            <div className="mx-auto max-w-3xl">
              {/* Success Header */}
              <div className="mb-8 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 ring-4 ring-purple-500/30">
                  <CheckCircle className="h-10 w-10 text-purple-500" />
                </div>
                <h1 className="mb-4 text-4xl font-bold text-gray-900">You're All Set!</h1>
                <p className="mb-2 text-xl text-gray-600">
                  Welcome
                  {user?.user_metadata?.first_name ? `, ${user.user_metadata.first_name}` : ''}!
                </p>
                <p className="text-lg text-gray-600">
                  {isPaidFlow
                    ? 'Payment confirmed. Your spot is secured for the track below.'
                    : "You've successfully booked the learning track below."}
                </p>

                {isPaidFlow && (
                  <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-800">
                    <BadgeCheck className="h-4 w-4" />
                    Payment successful · Booking confirmed
                  </div>
                )}
              </div>

              {/* Track Details Card */}
              <Card className="mb-8 overflow-hidden border-purple-500/30 shadow-lg">
                {/* Track Image */}
                <div className="relative h-48 w-full overflow-hidden bg-neutral-100">
                  <img
                    src={trackImageUrl}
                    alt={`${track.title} cover`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:brightness-95">
                        Learning Track
                      </Badge>
                      <Badge variant="secondary" className="bg-white/90 text-neutral-800">
                        {track.event_count} Sessions
                      </Badge>
                    </div>
                  </div>
                </div>

                <CardHeader className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
                  <div className="mb-2 flex items-center gap-2 text-purple-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Track Booking Confirmed</span>
                  </div>
                  <CardTitle className="text-2xl text-gray-900">{track.title}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                      <BookOpen className="h-5 w-5 text-purple-500" />
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Sessions Included
                        </div>
                        <div className="font-semibold text-neutral-900">
                          {track.event_count} {track.event_count === 1 ? 'Event' : 'Events'}
                        </div>
                      </div>
                    </div>

                    {firstEventDate && (
                      <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                        <Calendar className="h-5 w-5 text-purple-500" />
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                            First Session
                          </div>
                          <div className="font-semibold text-neutral-900">
                            {formatDateWithDay(firstEventDate.toISOString())}
                          </div>
                        </div>
                      </div>
                    )}

                    {track.location && (
                      <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                        <MapPin className="h-5 w-5 text-purple-500" />
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                            Location
                          </div>
                          <div className="font-semibold text-neutral-900">{track.location}</div>
                          {track.location_url && isValidLocationUrl(track.location_url) && (
                            <a
                              href={track.location_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-purple-500 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View on Map
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                      <Users className="h-5 w-5 text-purple-500" />
                      <div className="font-semibold text-neutral-900">
                        {track.spots_remaining !== null && track.spots_remaining <= 0
                          ? 'Sold Out'
                          : 'Limited Spots'}
                      </div>
                    </div>
                  </div>

                  {/* Session List */}
                  {events.length > 0 && (
                    <div className="rounded-xl border border-purple-500/20 bg-purple-50/50 p-4">
                      <div className="flex items-center gap-2 text-purple-700">
                        <BookOpen className="h-5 w-5" />
                        <span className="font-semibold">Sessions Included</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {events.slice(0, 5).map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                          >
                            <span className="font-medium text-neutral-900">{event.title}</span>
                            <span className="text-neutral-500">{formatCardDate(event.date)}</span>
                          </div>
                        ))}
                        {events.length > 5 && (
                          <p className="text-center text-xs text-neutral-500">
                            +{events.length - 5} more sessions
                          </p>
                        )}
                      </div>
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
                          ? 'border-purple-200 bg-purple-50/60 md:col-span-2'
                          : 'border-purple-200 bg-purple-50/60'
                      }
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-purple-900">
                          <BadgeCheck className="h-5 w-5" />
                          Payment Confirmed
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-purple-900/80">
                        <p>Your payment was processed successfully.</p>
                        <p>Your spot is reserved for all sessions in this track.</p>
                        <p>We will email you a receipt and session updates.</p>
                      </CardContent>
                    </Card>
                  )}

                  {showMembershipCard && (
                    <Card className={isPaidFlow ? '' : 'md:col-span-2'}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-neutral-900">
                          <Crown className="h-5 w-5 text-purple-500" />
                          Membership Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-neutral-700">
                        {hasActiveSubscription ? (
                          <>
                            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1 text-sm font-semibold text-purple-700">
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
                  Add sessions to your calendar
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {googleCalendarUrl && (
                    <Button
                      asChild
                      variant="outline"
                      className="flex h-12 items-center gap-2 border-neutral-300 hover:bg-neutral-50"
                    >
                      <a
                        href={googleCalendarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          calendarAnalyticsEvent &&
                          trackAddToCalendar({
                            itemId: calendarAnalyticsEvent.itemId,
                            itemName: calendarAnalyticsEvent.itemName,
                            calendarType: 'google_calendar',
                          })
                        }
                      >
                        <ExternalLink className="h-5 w-5" />
                        Add First Session to Google Calendar
                      </a>
                    </Button>
                  )}

                  <Button
                    onClick={downloadIcsFile}
                    variant="outline"
                    className="flex h-12 items-center gap-2 border-neutral-300 hover:bg-neutral-50"
                    disabled={events.length === 0}
                  >
                    <Download className="h-5 w-5" />
                    Download All Sessions (.ics)
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Button
                    onClick={() => navigate(`/tracks/${id}`)}
                    variant="outline"
                    className="flex h-12 items-center gap-2 border-neutral-300 hover:bg-neutral-50"
                  >
                    <Calendar className="h-5 w-5" />
                    View Track Details
                  </Button>

                  <Button
                    onClick={() => navigate('/dashboard')}
                    className="flex h-12 items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:brightness-95"
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
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                      <span className="text-sm font-semibold text-purple-700">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Check your email</h4>
                      <p className="text-sm text-gray-600">
                        We'll send you session reminders and important updates.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                      <span className="text-sm font-semibold text-purple-700">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Save the dates</h4>
                      <p className="text-sm text-gray-600">
                        Download the .ics file above to add all sessions to your calendar.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                      <span className="text-sm font-semibold text-purple-700">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Prepare for the track</h4>
                      <p className="text-sm text-gray-600">
                        Review the session schedule to get the most out of your learning experience.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                      <span className="text-sm font-semibold text-purple-700">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Explore more</h4>
                      <p className="text-sm text-gray-600">
                        Check out other tracks, resources, and connect with fellow marketers on your
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

export default ThankYouTrack;
