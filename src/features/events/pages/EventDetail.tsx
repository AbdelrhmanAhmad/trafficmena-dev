import { useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import {
  Calendar,
  CheckCircle,
  Clock,
  ClockIcon,
  ExternalLink,
  MapPin,
  Sparkles,
  Users,
  Video,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { usePricePreview } from '@/app/hooks/usePayments';
import { trackClickMeetingLink, trackViewItem } from '@/lib/analytics/events';
import { centsToUnits } from '@/lib/analytics/helpers';
import DataLoader from '@/shared/components/DataLoader';
import Layout from '@/shared/components/layout/Layout';
import {
  PaymentCheckoutDialog,
  PriceDisplayCard,
  PromoCodeInput,
} from '@/shared/components/payment';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/shared/context/AuthContext';
import { useIsManager } from '@/shared/hooks/custom/useIsManager';
import {
  isValidLocationUrl,
  useLocationVisibility,
} from '@/shared/hooks/custom/useLocationVisibility';
import { formatLongDate, formatTime } from '@/shared/utils/dateUtils';
import {
  clearPendingEventContext,
  storePendingEventContext,
} from '@/shared/utils/eventRedirectUtils';
import { CancellationConfirmDialog } from '../components/CancellationConfirmDialog';
import { useEventBooking } from '../hooks/useEventBooking';
import { useEvent } from '../hooks/useEvents';

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

type SanitizedHtmlProps = {
  className?: string;
  html: string;
};

const SanitizedDescription = ({ className, html }: SanitizedHtmlProps) => (
  <div
    className={className}
    // biome-ignore lint/security/noDangerouslySetInnerHtml: event descriptions are sanitized with DOMPurify
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { data: event, isLoading, error } = useEvent(id);
  const { isManager: isStaff, loading: adminLoading } = useIsManager();
  const { bookEvent, bookEventAsync, cancelBooking, isBooking, isCancelling } = useEventBooking();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoAttemptKey, setPromoAttemptKey] = useState(0);

  // Get price preview for logged-in users
  // Skip for track events where individual booking is not allowed (avoids 400 errors)
  const canFetchPricePreview =
    user && id && (!event?.trackInfo || event?.trackInfo?.singleBookingStart);
  const { data: pricePreview, isLoading: pricePreviewLoading } = usePricePreview(
    canFetchPricePreview ? 'event' : undefined,
    id,
    appliedPromoCode ?? undefined,
    { requestKey: promoAttemptKey },
  );

  const isPaidEvent = !!(event?.price_in_cents && event.price_in_cents > 0);
  const isOnlineEvent = Boolean(event?.meeting_link) && !event?.location;
  const needsPayment = isPaidEvent && !(pricePreview?.isSubscriber && isOnlineEvent);
  const promoError = pricePreview?.promoError ?? null;
  const isPromoApplied =
    Boolean(appliedPromoCode) && pricePreview?.discountSource === 'promo' && !promoError;
  const promoDisabledReason = !user
    ? 'Sign in to apply a promo code.'
    : pricePreview?.discountSource === 'subscriber'
      ? 'Subscriber discount already applied.'
      : pricePreview?.isFree
        ? 'Promo codes are not available for free items.'
        : null;
  const promoDisabled = Boolean(promoDisabledReason);
  const isStandaloneEvent = !event?.trackInfo;

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

  useEffect(() => {
    if (!id || !event || !user || !needsPayment) return;
    const checkoutParam = searchParams.get('checkout');
    if (checkoutParam !== '1') return;
    setShowPaymentDialog(true);
    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    const nextQuery = next.toString();
    navigate(`/meetups/${id}${nextQuery ? `?${nextQuery}` : ''}`, { replace: true });
  }, [event, id, navigate, needsPayment, searchParams, user]);

  useEffect(() => {
    if (!appliedPromoCode) return;
    if (promoDisabled && pricePreview) {
      setAppliedPromoCode(null);
    }
  }, [appliedPromoCode, promoDisabled, pricePreview]);

  // Track view_item when event detail loads
  const trackedEventIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!event || !id) return;
    if (trackedEventIdRef.current === id) return;
    trackedEventIdRef.current = id;

    const spotsRemaining = event.max_attendees
      ? event.max_attendees - (event.attendee_count ?? 0)
      : null;

    trackViewItem({
      currency: 'EGP',
      value: centsToUnits(event.price_in_cents),
      item: {
        item_id: event.id,
        item_name: event.title,
        item_category: event.event_type,
        price: centsToUnits(event.price_in_cents),
        currency: 'EGP',
        item_location: event.location ?? undefined,
        item_date: event.date,
        is_online: Boolean(event.meeting_link) && !event.location,
        spots_remaining: spotsRemaining,
      },
    });
  }, [event, id]);

  const attendeeCountLabel = useMemo(() => {
    if (!event) return 'Limited Spots';
    const spotsRemaining = event.max_attendees
      ? event.max_attendees - (event.attendee_count ?? 0)
      : null;
    if (spotsRemaining !== null && spotsRemaining <= 0) {
      return 'Sold Out';
    }
    return 'Limited Spots';
  }, [event]);

  const showMeetingLink = useMemo(() => {
    if (!event?.meeting_link || adminLoading) return false;
    if (isStaff) return true;
    if (event?.trackInfo?.booked) return true;
    return Boolean(event.attending);
  }, [adminLoading, event?.attending, event?.meeting_link, event?.trackInfo?.booked, isStaff]);

  // For track events: check track booking status, not event.attending
  // (users can't register for individual track events, they must book the track)
  const isTrackEvent = Boolean(event?.trackInfo);
  const hasAccess = isTrackEvent ? Boolean(event?.trackInfo?.booked) : Boolean(event?.attending);

  const showLocationUrl = useLocationVisibility(
    event?.location_url,
    hasAccess,
    isStaff,
    adminLoading,
  );

  const handleRegister = async () => {
    if (!id || !event) return;

    if (!user) {
      const stored = storePendingEventContext({
        eventId: id,
        eventTitle: event.title,
        eventDate: event.date,
        redirectUrl: `/meetups/${id}`,
        requiresPayment: needsPayment,
      });

      if (!stored) {
        console.warn('Failed to capture event context prior to signup redirect.');
      }

      navigate('/signup?source=event');
      return;
    }

    // If event requires payment, open payment dialog
    if (needsPayment) {
      setShowPaymentDialog(true);
      return;
    }

    // Free event or subscriber with free access - register and redirect to thank-you page
    try {
      const response = await bookEventAsync({ event_id: id });
      if (response.success) {
        navigate(`/thank-you-event/${id}`);
      }
    } catch {
      // Error toast is handled by the mutation's onError
    }
  };

  const handleCancel = () => {
    if (!id) return;
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    if (!id) return;
    cancelBooking({ eventId: id });
    setShowCancelDialog(false);
  };

  const sanitizedDescription = useMemo(
    () => (event?.description ? DOMPurify.sanitize(event.description) : null),
    [event?.description],
  );
  const eventImageUrl =
    event?.image_url && event.image_url.trim().length > 0
      ? event.image_url.trim()
      : '/placeholder.svg';
  const isUpcoming = event ? new Date(event.date) > new Date() : false;
  const locationLabel =
    event?.location && event.location.trim().length > 0
      ? event.location.trim()
      : event?.meeting_link
        ? 'Online'
        : 'Location coming soon';

  return (
    <Layout>
      <DataLoader
        loading={isLoading}
        error={error ? 'Unable to load this event right now.' : null}
        loadingText="Loading event details..."
      >
        {event && (
          <div className="relative isolate overflow-hidden">
            <div className="pointer-events-none absolute -left-[45vw] top-[-25vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/60 via-[#f4fff9]/40 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute -right-[48vw] top-[35vh] -z-10 h-[55vh] w-[80vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[90px]" />

            <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 pb-20 pt-12 sm:px-6 lg:px-0">
              <div className="lg:hidden">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-600">
                  <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1">
                    <Sparkles className="h-3 w-3 text-[#05ef62]" />
                    TrafficMENA Event
                  </span>
                  <span className="rounded-full bg-neutral-900/90 px-3 py-1 text-[11px] font-semibold text-white">
                    {event.event_type}
                  </span>
                  {event.tags[0] && (
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] text-neutral-600">
                      {event.tags[0]}
                    </span>
                  )}
                </div>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-neutral-900">
                  {event.title}
                </h1>
              </div>

              <section className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr),340px]">
                <div className="order-2 rounded-[28px] border border-neutral-200 bg-white/95 p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-10 lg:order-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-600">
                    <span className="hidden items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 lg:inline-flex">
                      <Sparkles className="h-3 w-3 text-[#05ef62]" />
                      TrafficMENA Event
                    </span>
                    <span className="hidden rounded-full bg-neutral-900/90 px-3 py-1 text-[11px] font-semibold text-white lg:inline">
                      {event.event_type}
                    </span>
                    {event.trackInfo && (
                      <button
                        type="button"
                        className="hidden cursor-pointer items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 transition-colors hover:bg-emerald-100 lg:inline-flex"
                        onClick={() => navigate(`/tracks/${event.trackInfo?.id}`)}
                      >
                        Part of: {event.trackInfo.title}
                      </button>
                    )}
                    {event.tags[0] && (
                      <span className="hidden rounded-full bg-neutral-100 px-3 py-1 text-[11px] text-neutral-600 lg:inline">
                        {event.tags[0]}
                      </span>
                    )}
                  </div>

                  <h1 className="mt-5 hidden text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl lg:block">
                    {event.title}
                  </h1>

                  {sanitizedDescription && (
                    <div className="mt-8 space-y-4">
                      <h2 className="text-lg font-semibold text-neutral-900">What to Expect</h2>
                      <SanitizedDescription
                        className="prose prose-base max-w-none text-neutral-700 prose-headings:text-neutral-900 prose-strong:text-neutral-900 prose-a:text-[#05ef62]"
                        html={sanitizedDescription}
                      />
                    </div>
                  )}
                </div>

                <aside className="order-1 lg:order-2 lg:sticky lg:top-24">
                  <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_10px_30px_-18px_rgba(16,16,16,0.35)]">
                    <div className="aspect-[2/1] w-full overflow-hidden bg-neutral-100">
                      <img
                        src={eventImageUrl}
                        alt={`${event.title} cover`}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="space-y-4 p-6">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          isUpcoming
                            ? 'bg-[#05ef62]/10 text-[#059669]'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {isUpcoming ? 'Upcoming Session' : 'Past Session'}
                      </span>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                          <Calendar className="h-5 w-5 text-[#05ef62]" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                              Date
                            </p>
                            <p className="text-sm font-semibold text-neutral-900">
                              {formatLongDate(event.date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                          <Clock className="h-5 w-5 text-[#05ef62]" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                              Time
                            </p>
                            <p className="text-sm font-semibold text-neutral-900">
                              {formatTime(event.date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                          <MapPin className="h-5 w-5 text-[#05ef62]" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                              Location
                            </p>
                            {showLocationUrl ? (
                              <>
                                <p className="text-sm font-semibold text-neutral-900">
                                  {locationLabel}
                                </p>
                                {event?.location_url && isValidLocationUrl(event.location_url) && (
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
                              </>
                            ) : (
                              <p className="text-sm text-neutral-500">
                                {isTrackEvent
                                  ? 'Book the track to view location'
                                  : 'Register to view location'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                          <Users className="h-5 w-5 text-[#05ef62]" />
                          <p className="text-sm font-semibold text-neutral-900">
                            {attendeeCountLabel}
                          </p>
                        </div>

                        {/* Price display */}
                        {isPaidEvent && (
                          <div className="space-y-3">
                            <PriceDisplayCard
                              itemType="event"
                              basePriceCents={event.price_in_cents}
                              pricePreview={pricePreview}
                            />
                            {isStandaloneEvent && (
                              <PromoCodeInput
                                onApply={(code) => {
                                  setAppliedPromoCode(code);
                                  setPromoAttemptKey((currentKey) => currentKey + 1);
                                }}
                                onRemove={() => setAppliedPromoCode(null)}
                                appliedCode={appliedPromoCode ?? undefined}
                                isApplied={isPromoApplied}
                                error={promoError}
                                isLoading={pricePreviewLoading}
                                disabled={promoDisabled}
                                disabledMessage={promoDisabledReason ?? undefined}
                                attemptKey={promoAttemptKey}
                                itemType="event"
                                itemId={id}
                                discountPercent={
                                  isPromoApplied && pricePreview?.originalAmountCents
                                    ? Math.round(
                                        (pricePreview.discountAppliedCents /
                                          pricePreview.originalAmountCents) *
                                          100,
                                      )
                                    : undefined
                                }
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {(() => {
                        const trackInfo = event.trackInfo;
                        let canBookSingle = true;
                        let bookingMessage: string | null = null;
                        let showTrackBookingOnly = false;

                        if (trackInfo?.singleBookingStart) {
                          const now = new Date();
                          const start = new Date(trackInfo.singleBookingStart);
                          const end = trackInfo.singleBookingEnd
                            ? new Date(trackInfo.singleBookingEnd)
                            : null;

                          if (now < start) {
                            // Before single booking opens - don't reveal the date
                            canBookSingle = false;
                            showTrackBookingOnly = true;
                          } else if (end && now > end) {
                            canBookSingle = false;
                            bookingMessage = 'Individual registration has closed.';
                          }
                        } else if (trackInfo && !trackInfo.singleBookingStart) {
                          // If in track but no single booking dates, direct to track
                          if (trackInfo.trackBookingStart) {
                            canBookSingle = false;
                            showTrackBookingOnly = true;
                          }
                        }

                        // Show track booking CTA when single booking not yet open
                        if (showTrackBookingOnly && trackInfo && !event.attending) {
                          return (
                            <div className="space-y-3">
                              <Button
                                className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-3 text-sm font-medium text-white hover:brightness-95"
                                onClick={() => navigate(`/tracks/${trackInfo.id}`)}
                              >
                                Book Full Track
                              </Button>
                              <p className="text-center text-xs text-muted-foreground">
                                This event is part of a learning track
                              </p>
                            </div>
                          );
                        }

                        if (!canBookSingle && !event.attending && bookingMessage) {
                          return (
                            <div className="space-y-3">
                              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                <p className="font-medium">Registration Closed</p>
                                <p className="mt-1">{bookingMessage}</p>
                                <Button
                                  variant="link"
                                  className="mt-2 h-auto p-0 text-amber-900 underline"
                                  onClick={() => navigate(`/tracks/${trackInfo?.id}`)}
                                >
                                  View Full Track
                                </Button>
                              </div>
                              <Button disabled className="w-full rounded-xl" variant="secondary">
                                Registration Closed
                              </Button>
                            </div>
                          );
                        }

                        // Refund pending - show disabled button
                        if (event.registrationStatus === 'refund_requested') {
                          return (
                            <Button className="w-full rounded-xl" variant="secondary" disabled>
                              Refund Request Pending
                            </Button>
                          );
                        }

                        return (
                          <Button
                            className="w-full rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-6 py-3 text-sm font-medium text-[#101010] hover:brightness-95"
                            onClick={event.attending ? handleCancel : handleRegister}
                            disabled={isBooking || isCancelling}
                          >
                            {event.attending ? 'Cancel Registration' : 'Register for Event'}
                          </Button>
                        );
                      })()}

                      {event.registrationStatus === 'refund_requested' && (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700">
                          <ClockIcon className="h-4 w-4" />
                          <span>Refund Requested - Pending Review</span>
                        </div>
                      )}

                      {event.attending && (
                        <div className="flex items-center gap-2 rounded-xl bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          <span>You're registered</span>
                        </div>
                      )}

                      {event.meeting_link && (
                        <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                          <div className="flex items-center gap-2 text-neutral-900">
                            <Video className="h-4 w-4 text-[#05ef62]" />
                            <span className="text-sm font-semibold">Meeting Link</span>
                          </div>
                          <div className="mt-3">
                            {showMeetingLink ? (
                              (() => {
                                const validation = validateMeetingUrl(event.meeting_link ?? '');
                                if (!validation.isValid) {
                                  return <p className="text-xs text-red-500">{validation.error}</p>;
                                }
                                return (
                                  <a
                                    href={validation.validatedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800"
                                    onClick={() =>
                                      trackClickMeetingLink({
                                        itemId: event.id,
                                        itemName: event.title,
                                        itemCategory: event.event_type,
                                        meetingUrl: event.meeting_link ?? '',
                                      })
                                    }
                                  >
                                    Join Live Session
                                  </a>
                                );
                              })()
                            ) : (
                              <p className="text-xs text-neutral-600">
                                Register to unlock the secure meeting link.
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {event.tags.length > 0 && (
                        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Topics & Focus Areas
                          </span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {event.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="rounded-full px-3 py-1 text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </aside>
              </section>
            </div>
          </div>
        )}
      </DataLoader>

      {/* Payment dialog for paid events */}
      {event && id && (
        <PaymentCheckoutDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          itemType="event"
          itemId={id}
          itemName={event.title}
          itemCategory={event.event_type}
          basePriceCents={event.price_in_cents}
          appliedPromoCode={isPromoApplied ? (appliedPromoCode ?? undefined) : undefined}
          onSuccess={() => {
            // Refresh the event data after successful payment
            queryClient.invalidateQueries({ queryKey: ['event', id] });
            setShowPaymentDialog(false);
          }}
        />
      )}

      {/* Cancellation confirmation dialog */}
      {event && (
        <CancellationConfirmDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          onConfirm={confirmCancel}
          isPaidEvent={Boolean(event.price_in_cents && event.price_in_cents > 0)}
          isLoading={isCancelling}
        />
      )}
    </Layout>
  );
};

export default EventDetail;
