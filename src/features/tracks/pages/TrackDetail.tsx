import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  ExternalLink,
  Loader2,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { PublicTrackEventRecord } from '@/app/api/tracks';
import { usePricePreview } from '@/app/hooks/usePayments';
import { trackViewItem } from '@/lib/analytics/events';
import { centsToUnits } from '@/lib/analytics/helpers';
import DataLoader from '@/shared/components/DataLoader';
import Layout from '@/shared/components/layout/Layout';
import {
  PaymentCheckoutDialog,
  PriceDisplayCard,
  PromoCodeInput,
} from '@/shared/components/payment';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/shared/context/AuthContext';
import { useIsManager } from '@/shared/hooks/custom/useIsManager';
import {
  isValidLocationUrl,
  useLocationVisibility,
} from '@/shared/hooks/custom/useLocationVisibility';
import { storePendingTrackContext } from '@/shared/utils/trackRedirectUtils';
import { useBookTrack, usePublicTrack } from '../hooks/useTracks';
import { getTrackBookingState } from '../utils/trackBookingState';

type SanitizedHtmlProps = {
  className?: string;
  html: string;
};

const SanitizedDescription = ({ className, html }: SanitizedHtmlProps) => (
  <div
    className={className}
    // biome-ignore lint/security/noDangerouslySetInnerHtml: track descriptions are sanitized with DOMPurify
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

// Simplified event card for track detail
function TrackEventCard({ event }: { event: PublicTrackEventRecord }) {
  const navigate = useNavigate();
  const eventDate = new Date(event.date);
  const formattedDate = format(eventDate, 'MMM d, yyyy');
  const formattedTime = format(eventDate, 'h:mm a');
  const isUpcoming = eventDate.getTime() > Date.now();

  const imageUrl = event.image_url ?? '/uploads/trafficmena-event.png';

  return (
    <button
      type="button"
      className="group relative w-full cursor-pointer overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      onClick={() => navigate(`/meetups/${event.id}`)}
    >
      <div className="relative">
        <div className="relative aspect-[300/160] w-full overflow-hidden">
          <img
            src={imageUrl}
            alt={event.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        </div>
        <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-neutral-800 shadow-sm">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isUpcoming
                ? 'bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010]'
                : 'bg-neutral-200 text-neutral-600'
            }`}
          >
            {isUpcoming ? 'Upcoming' : 'Past'}
          </span>
          <span className="rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] font-medium text-white">
            {event.event_type}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 font-semibold tracking-tight text-neutral-900">
          {event.title}
        </h3>
        <div className="mt-2 flex items-center gap-4 text-sm text-neutral-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formattedDate}
          </span>
          <span>{formattedTime}</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-sm text-neutral-500">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{event.location ?? 'Online'}</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
          <span className="flex items-center gap-1 text-sm text-neutral-600">
            <Users className="h-4 w-4" />
            {event.max_attendees && event.attendee_count >= event.max_attendees
              ? 'Sold Out'
              : 'Limited Spots'}
          </span>
        </div>
      </div>
    </button>
  );
}

const TrackDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { isManager: isStaff, loading: adminLoading } = useIsManager();
  const { data, isLoading, error } = usePublicTrack(id || '', user?.id);
  const bookMutation = useBookTrack();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoAttemptKey, setPromoAttemptKey] = useState(0);

  const track = data?.track;
  const events = data?.events ?? [];

  // Get price preview for logged-in users
  const { data: pricePreview, isLoading: pricePreviewLoading } = usePricePreview(
    user && id ? 'track' : undefined,
    id,
    appliedPromoCode ?? undefined,
    { requestKey: promoAttemptKey },
  );

  const isPaidTrack = !!(track?.price_in_cents && track.price_in_cents > 0);
  const needsPayment = isPaidTrack;
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

  const bookingState = useMemo(
    () =>
      getTrackBookingState({
        userHasBooked: track?.user_has_booked,
        userHasPendingPayment: track?.user_has_pending_payment,
      }),
    [track?.user_has_booked, track?.user_has_pending_payment],
  );

  const pendingPaymentUrl = useMemo(() => {
    if (!track?.user_has_pending_payment || !id) return null;
    const params = new URLSearchParams();
    params.set('item_type', 'track');
    params.set('item_id', id);
    if (track.pending_invoice_id) {
      params.set('invoice_id', String(track.pending_invoice_id));
    }
    if (track.pending_payment_id) {
      params.set('payment_id', track.pending_payment_id);
    }
    const query = params.toString();
    return query ? `/payment/pending?${query}` : '/payment/pending';
  }, [id, track?.pending_invoice_id, track?.pending_payment_id, track?.user_has_pending_payment]);

  const showLocationUrl = useLocationVisibility(
    track?.location_url,
    Boolean(track?.user_has_booked),
    isStaff,
    adminLoading,
  );

  const sanitizedDescription = useMemo(
    () => (track?.description ? DOMPurify.sanitize(track.description) : null),
    [track?.description],
  );

  const trackImageUrl =
    track?.image_url && track.image_url.trim().length > 0
      ? track.image_url.trim()
      : '/uploads/trafficmena-track.png';

  // Booking status
  const bookingStatus = useMemo(() => {
    if (!track) return { canBook: false, message: null };

    const now = new Date();
    const start = track.track_booking_start;
    const end = track.track_booking_end;

    if (!start || !end) {
      return { canBook: false, message: 'Booking not configured for this track.' };
    }

    if (now < start) {
      return {
        canBook: false,
        message: `Booking opens on ${format(start, 'MMM d, yyyy')}`,
      };
    }

    if (now > end) {
      return { canBook: false, message: 'Booking period has ended.' };
    }

    if (track.spots_remaining !== null && track.spots_remaining <= 0) {
      return { canBook: false, message: 'This track is fully booked.' };
    }

    return { canBook: true, message: null };
  }, [track]);

  useEffect(() => {
    if (!id || !track || !user || !needsPayment) return;
    const checkoutParam = searchParams.get('checkout');
    if (checkoutParam !== '1') return;
    setShowPaymentDialog(true);
    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    const nextQuery = next.toString();
    navigate(`/tracks/${id}${nextQuery ? `?${nextQuery}` : ''}`, { replace: true });
  }, [id, navigate, needsPayment, searchParams, track, user]);

  useEffect(() => {
    if (!appliedPromoCode) return;
    if (promoDisabled && pricePreview) {
      setAppliedPromoCode(null);
    }
  }, [appliedPromoCode, promoDisabled, pricePreview]);

  // Track view_item when track detail loads
  const trackedTrackIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!track || !id) return;
    if (trackedTrackIdRef.current === id) return;
    trackedTrackIdRef.current = id;

    trackViewItem({
      currency: 'EGP',
      value: centsToUnits(track.price_in_cents),
      item: {
        item_id: track.id,
        item_name: track.title,
        item_category: 'Track',
        price: centsToUnits(track.price_in_cents),
        currency: 'EGP',
        item_location: track.location ?? undefined,
        spots_remaining: track.spots_remaining,
      },
    });
  }, [track, id]);

  const handleBook = () => {
    if (!id) return;

    if (!user) {
      if (track) {
        const stored = storePendingTrackContext({
          trackId: id,
          trackTitle: track.title,
          redirectUrl: `/tracks/${id}`,
          requiresPayment: needsPayment,
        });

        if (!stored) {
          console.warn('Failed to capture track context prior to signup redirect.');
        }
      }

      navigate('/signup?source=track');
      return;
    }

    // If track requires payment, open payment dialog
    if (needsPayment) {
      setShowPaymentDialog(true);
      return;
    }

    // Free track - book directly
    bookMutation.mutate(id);
  };

  const handleResumePayment = () => {
    if (pendingPaymentUrl) {
      navigate(pendingPaymentUrl);
      return;
    }
    setShowPaymentDialog(true);
  };

  const handleRequestNewCode = () => {
    setShowPaymentDialog(true);
  };

  // First event date
  const firstEventDate = events.length > 0 ? new Date(events[0].date) : null;

  return (
    <Layout>
      <DataLoader
        loading={isLoading}
        error={error ? 'Unable to load this track right now.' : null}
        loadingText="Loading track details..."
      >
        {track && (
          <div className="relative isolate overflow-hidden">
            <div className="pointer-events-none absolute -left-[45vw] top-[-25vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-purple-100/60 via-indigo-50/40 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute -right-[48vw] top-[35vh] -z-10 h-[55vh] w-[80vw] rounded-full bg-gradient-to-tr from-purple-200/25 via-indigo-100/20 to-transparent blur-[90px]" />

            <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 pb-20 pt-12 sm:px-6 lg:px-0">
              {/* Mobile Header */}
              <div className="lg:hidden">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-600">
                  <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1">
                    <Sparkles className="h-3 w-3 text-purple-500" />
                    TrafficMENA Track
                  </span>
                  <span className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-3 py-1 text-[11px] font-semibold text-white">
                    {track.event_count} Sessions
                  </span>
                </div>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-neutral-900">
                  {track.title}
                </h1>
              </div>

              <section className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr),340px]">
                {/* Main Content */}
                <div className="order-2 space-y-8 lg:order-1">
                  <div className="rounded-[28px] border border-neutral-200 bg-white/95 p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-10">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-600">
                      <span className="hidden items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 lg:inline-flex">
                        <Sparkles className="h-3 w-3 text-purple-500" />
                        TrafficMENA Track
                      </span>
                      <span className="hidden rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-3 py-1 text-[11px] font-semibold text-white lg:inline">
                        {track.event_count} Sessions
                      </span>
                    </div>

                    <h1 className="mt-5 hidden text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl lg:block">
                      {track.title}
                    </h1>

                    {sanitizedDescription && (
                      <div className="mt-8 space-y-4">
                        <h2 className="text-lg font-semibold text-neutral-900">About This Track</h2>
                        <SanitizedDescription
                          className="prose prose-base max-w-none text-neutral-700 prose-headings:text-neutral-900 prose-strong:text-neutral-900 prose-a:text-purple-500"
                          html={sanitizedDescription}
                        />
                      </div>
                    )}
                  </div>

                  {/* Events in Track */}
                  <div className="rounded-[28px] border border-neutral-200 bg-white/95 p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-10">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-500" />
                      <h2 className="text-xl font-semibold text-neutral-900">
                        Sessions Included ({events.length})
                      </h2>
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">
                      Book this track to get access to all sessions below.
                    </p>

                    {events.length > 0 ? (
                      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                        {events.map((event) => (
                          <TrackEventCard key={event.id} event={event} />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-6 rounded-xl border-2 border-dashed border-neutral-200 py-12 text-center">
                        <Calendar className="mx-auto h-10 w-10 text-neutral-400" />
                        <p className="mt-3 text-sm text-neutral-600">
                          No sessions have been added to this track yet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <aside className="order-1 lg:order-2 lg:sticky lg:top-24">
                  <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_10px_30px_-18px_rgba(16,16,16,0.35)]">
                    <div className="aspect-[2/1] w-full overflow-hidden bg-neutral-100">
                      <img
                        src={trackImageUrl}
                        alt={`${track.title} cover`}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="space-y-4 p-6">
                      <span className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                        Learning Track
                      </span>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                          <BookOpen className="h-5 w-5 text-purple-500" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                              Sessions
                            </p>
                            <p className="text-sm font-semibold text-neutral-900">
                              {track.event_count} {track.event_count === 1 ? 'Event' : 'Events'}
                            </p>
                          </div>
                        </div>
                        {firstEventDate && (
                          <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                            <Calendar className="h-5 w-5 text-purple-500" />
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                                Starts
                              </p>
                              <p className="text-sm font-semibold text-neutral-900">
                                {format(firstEventDate, 'MMMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        )}
                        {track.location && (
                          <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                            <MapPin className="h-5 w-5 text-purple-500" />
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                                Location
                              </p>
                              {showLocationUrl ? (
                                <>
                                  <p className="text-sm font-semibold text-neutral-900">
                                    {track.location}
                                  </p>
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
                                </>
                              ) : (
                                <p className="text-sm text-neutral-500">
                                  Book track to view location
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                          <Users className="h-5 w-5 text-purple-500" />
                          <p className="text-sm font-semibold text-neutral-900">
                            {track.spots_remaining !== null && track.spots_remaining <= 0
                              ? 'Sold Out'
                              : 'Limited Spots'}
                          </p>
                        </div>

                        {/* Price display */}
                        {isPaidTrack && (
                          <div className="space-y-3">
                            <PriceDisplayCard
                              itemType="track"
                              basePriceCents={track.price_in_cents}
                              pricePreview={pricePreview}
                            />
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
                              itemType="track"
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
                          </div>
                        )}
                      </div>

                      {bookingState === 'booked' ? (
                        <div className="flex items-center gap-2 rounded-xl bg-green-100 px-4 py-3 text-sm font-medium text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          <span>You're enrolled in this track</span>
                        </div>
                      ) : bookingState === 'pending' ? (
                        <div className="space-y-3">
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            <p className="font-medium">Payment pending</p>
                            <p className="mt-1">
                              Complete your payment to secure your spot in this track.
                            </p>
                          </div>
                          <Button
                            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-medium text-white hover:brightness-95"
                            onClick={handleResumePayment}
                          >
                            Resume payment
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full rounded-xl"
                            onClick={handleRequestNewCode}
                          >
                            Request new code
                          </Button>
                        </div>
                      ) : bookingStatus.canBook ? (
                        <Button
                          className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-3 text-sm font-medium text-white hover:brightness-95"
                          onClick={handleBook}
                          disabled={bookMutation.isPending}
                        >
                          {bookMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Booking...
                            </>
                          ) : (
                            'Book Full Track'
                          )}
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            <p className="font-medium">Booking Unavailable</p>
                            <p className="mt-1">{bookingStatus.message}</p>
                          </div>
                          <Button disabled className="w-full rounded-xl" variant="secondary">
                            {track.spots_remaining !== null && track.spots_remaining <= 0
                              ? 'Sold Out'
                              : 'Booking Closed'}
                          </Button>
                        </div>
                      )}

                      {track.track_booking_start && track.track_booking_end && (
                        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Booking Window
                          </span>
                          <p className="mt-1 text-sm text-neutral-700">
                            {format(track.track_booking_start, 'MMM d')} -{' '}
                            {format(track.track_booking_end, 'MMM d, yyyy')}
                          </p>
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

      {/* Payment dialog for paid tracks */}
      {track && id && (
        <PaymentCheckoutDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          itemType="track"
          itemId={id}
          itemName={track.title}
          itemCategory="Track"
          basePriceCents={track.price_in_cents}
          appliedPromoCode={isPromoApplied ? (appliedPromoCode ?? undefined) : undefined}
          onSuccess={() => {
            // Refresh the track data after successful payment
            queryClient.invalidateQueries({ queryKey: ['tracks', 'public', 'detail', id] });
            setShowPaymentDialog(false);
          }}
        />
      )}
    </Layout>
  );
};

export default TrackDetail;
