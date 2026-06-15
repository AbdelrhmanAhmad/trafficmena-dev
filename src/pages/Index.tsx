import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Crown,
  FileText,
  Library,
  MessageCircle,
  Rocket,
  Sparkles,
  Users2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { type EventRecord, fetchEvents } from '@/app/api/events';
import { fetchPublicTracks, type PublicTrackRecord } from '@/app/api/tracks';
import { EventCard } from '@/features/events/components/EventCard';
import { PublicTrackCard } from '@/features/tracks/components/PublicTrackCard';
import {
  buildEventDiscoveryItem,
  buildTrackDiscoveryItem,
  EVENTS_LIST_CONTEXT,
  isCanonicalDiscoveryListPath,
  TRACKS_LIST_CONTEXT,
  useTrackedItemListView,
} from '@/lib/analytics/contentDiscovery';
import { trackSelectItem } from '@/lib/analytics/events';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';
import { useErrorHandler } from '@/shared/utils/errorHandling';

const benefitItems = [
  // FREE ITEMS (01-03)
  {
    id: '01',
    title: 'Complete Learning Tracks: Yours Free',
    points: [
      'E-commerce Business Track: 7 sessions covering idea to analytics',
      'AI for Marketers Track: 5 sessions on practical AI tools',
      'Each session taught by a different specialist. Multiple experts, not one instructor',
    ],
    icon: BookOpen,
    isPremium: false,
    mediaClassName:
      'aspect-video w-full rounded-2xl bg-gradient-to-br from-[#05ef62]/20 via-[#00fdc2]/10 to-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden shadow-sm',
    iconClassName: 'h-16 w-16 text-[#05ef62]/40',
  },
  {
    id: '02',
    title: 'Professional Marketing Calculators',
    points: [
      'ROAS Calculator: Know your true return on ad spend',
      'MER Calculator: Understand your blended performance',
      'CAC & nCAC Calculators: Track acquisition costs accurately',
      '19 more tools used by professional marketers daily',
    ],
    icon: Calculator,
    isPremium: false,
    mediaClassName:
      'aspect-video w-full rounded-2xl bg-gradient-to-br from-[#00fdc2]/20 via-[#05ef62]/10 to-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden shadow-sm',
    iconClassName: 'h-16 w-16 text-[#00fdc2]/50',
  },
  {
    id: '03',
    title: 'Direct Access to Experts Every Month',
    points: [
      'Monthly live Q&A sessions with industry practitioners',
      'Ask about your specific challenges, get real answers',
      'No gatekeeping. Free members get the same expert access',
    ],
    icon: MessageCircle,
    isPremium: false,
    mediaClassName:
      'aspect-video w-full rounded-2xl bg-gradient-to-br from-[#05ef62]/15 via-neutral-100 to-[#00fdc2]/10 border border-neutral-200 flex items-center justify-center overflow-hidden shadow-sm',
    iconClassName: 'h-16 w-16 text-[#05ef62]/40',
  },
  // PREMIUM ITEMS (04-06)
  {
    id: '04',
    title: 'Advanced Tracks for Serious Marketers',
    points: [
      'Content Marketing Track: 6 sessions + Content Marketing Day materials',
      'Performance Marketing Track: 7 sessions + Performance Marketing Day materials',
      'All future tracks included free. No additional cost as we grow',
    ],
    icon: Rocket,
    isPremium: true,
    mediaClassName:
      'aspect-video w-full rounded-2xl bg-gradient-to-br from-amber-100/50 via-amber-50/30 to-neutral-100 border border-amber-200 flex items-center justify-center overflow-hidden shadow-sm',
    iconClassName: 'h-16 w-16 text-amber-500/50',
  },
  {
    id: '05',
    title: 'Playbooks, Templates & Exclusive Guides',
    points: [
      "Ready-to-use templates from practitioners who've proven them",
      'Step-by-step playbooks for specific marketing challenges',
      'Discounts on highly specialized premium resources',
    ],
    icon: FileText,
    isPremium: true,
    mediaClassName:
      'aspect-video w-full rounded-2xl bg-gradient-to-br from-amber-50/50 via-amber-100/30 to-neutral-100 border border-amber-200 flex items-center justify-center overflow-hidden shadow-sm',
    iconClassName: 'h-16 w-16 text-amber-500/40',
  },
  {
    id: '06',
    title: 'VIP Treatment & Specialized Networks',
    points: [
      '2x Monthly Q&A sessions (double the free tier)',
      '20%+ discount on all offline events and intensive days',
      'Specialty subgroups for your specific focus area',
    ],
    icon: Crown,
    isPremium: true,
    mediaClassName:
      'aspect-video w-full rounded-2xl bg-gradient-to-br from-amber-100/60 via-amber-50/40 to-neutral-100 border border-amber-200 flex items-center justify-center overflow-hidden shadow-sm',
    iconClassName: 'h-16 w-16 text-amber-600/50',
  },
];

const FREE_FEATURES = [
  { icon: BookOpen, title: 'E-commerce Business Track', desc: '7 expert sessions' },
  { icon: Sparkles, title: 'AI for Marketers Track', desc: '5 practical sessions' },
  { icon: MessageCircle, title: 'Monthly Q&A Session', desc: 'Direct expert access' },
  { icon: Calculator, title: '23 Marketing Calculators', desc: 'ROAS, MER, CAC & more' },
  {
    icon: Library,
    title: 'Premium Content Access',
    desc: 'After 6+ months',
    isSubscriptionFeature: true,
  },
  { icon: Users2, title: 'Community Access', desc: '1,200+ marketers' },
];

const Index: React.FC = () => {
  const { pathname } = useLocation();
  const shouldTrackDiscoveryLists = isCanonicalDiscoveryListPath(pathname);
  const { handleError } = useErrorHandler();
  const { canAccessSubscriptionPages } = useRolePermissions();
  const [visibleEvents, setVisibleEvents] = useState(6);
  const [isLoaded, setIsLoaded] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const heroImage = '/uploads/82e73a70-07ff-410e-b9f5-906aa4d1b00c.png';

  const {
    data: meetups,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['landing-events'],
    queryFn: async (): Promise<EventRecord[]> => {
      try {
        const response = await fetchEvents({ page: 1, pageSize: 9, upcoming: true });
        return response.items;
      } catch (err) {
        handleError(err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const events = meetups ?? [];

  // Fetch published tracks for the landing page
  const { data: tracksData, isLoading: tracksLoading } = useQuery({
    queryKey: ['landing-tracks'],
    queryFn: async (): Promise<PublicTrackRecord[]> => {
      try {
        const response = await fetchPublicTracks({ page: 1, pageSize: 6 });
        return response.items;
      } catch {
        // Silently fail - tracks section is optional
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const tracks = tracksData ?? [];

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleEvents((prev) =>
          prev >= events.length ? prev : Math.min(prev + 3, events.length),
        );
      },
      { threshold: 0.1 },
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [events.length]);

  // Mark component as loaded for animations
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const displayEvents = events.slice(0, visibleEvents);
  const eventListItems = useMemo(
    () => displayEvents.map((event, index) => buildEventDiscoveryItem(event, index)),
    [displayEvents],
  );
  const trackListItems = useMemo(
    () => tracks.map((track, index) => buildTrackDiscoveryItem(track, index)),
    [tracks],
  );
  const visibleBenefitItems = canAccessSubscriptionPages
    ? benefitItems
    : benefitItems.filter((item) => !item.isPremium);
  const visibleFreeFeatures = canAccessSubscriptionPages
    ? FREE_FEATURES
    : FREE_FEATURES.filter((item) => !item.isSubscriptionFeature);

  useTrackedItemListView(EVENTS_LIST_CONTEXT, eventListItems, {
    enabled: shouldTrackDiscoveryLists,
  });
  useTrackedItemListView(TRACKS_LIST_CONTEXT, trackListItems, {
    enabled: shouldTrackDiscoveryLists,
  });

  return (
    <Layout>
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -left-[45vw] top-[-25vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/70 via-[#f4fff9]/40 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -right-[50vw] top-[30vh] -z-10 h-[50vh] w-[80vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[90px]" />

        <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 pb-20 pt-12 sm:px-6 lg:px-0">
          <section
            className={`relative mx-auto w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-neutral-50 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur ${isLoaded ? 'animate-fade-in' : ''}`}
          >
            <div className="relative grid grid-cols-1 gap-8 sm:p-10 lg:grid-cols-12 lg:gap-10 p-6">
              {/* Left column - Exactly like reference */}
              <div
                className={`order-2 flex flex-col justify-between lg:order-1 lg:col-span-6 ${isLoaded ? 'animate-slide-in-left' : ''}`}
              >
                <div className="max-w-xl">
                  {/* MVP Badge - Exactly like reference */}
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-medium text-neutral-700 backdrop-blur hover:bg-white/80 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62] to-[#29cf9f] text-[#101010]">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    MVP Live
                    <span className="mx-1.5 h-1 w-1 rounded-full bg-neutral-400"></span>
                    Early members onboarding now
                  </div>

                  {/* Headline - Exactly like reference */}
                  <h1
                    className={`text-5xl font-semibold tracking-tight text-neutral-900 sm:text-6xl lg:text-7xl ${isLoaded ? 'animate-fade-in-up' : ''}`}
                  >
                    Learn Digital Marketing From The Experts Who've Done It
                  </h1>

                  <p
                    className={`mt-5 max-w-lg text-base leading-relaxed text-neutral-700 ${isLoaded ? 'animate-fade-in-up' : ''}`}
                  >
                    TrafficMENA connects you with practitioners, not professors, through expert-led
                    meetups, structured learning tracks, and a community that actually helps you
                    grow.
                  </p>

                  <div
                    className={`mt-8 flex flex-wrap items-center justify-center gap-3 sm:justify-start ${isLoaded ? 'animate-fade-in-up' : ''}`}
                  >
                    {/* Primary CTA - Join Free */}
                    <Button
                      className="group flex gap-2 transform rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-6 py-3.5 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95"
                      asChild
                    >
                      <Link to="/signup">
                        <Users2 className="h-4 w-4" />
                        <span>Join Free</span>
                      </Link>
                    </Button>

                    {canAccessSubscriptionPages && (
                      <Button
                        className="group flex gap-2 transform rounded-xl border-2 border-amber-300 bg-amber-50 px-6 py-3.5 text-sm font-medium text-amber-700 transition-all duration-300 hover:bg-amber-100 hover:shadow-lg hover:scale-105 hover:-translate-y-1 active:scale-95"
                        asChild
                      >
                        <Link to="/subscribe">
                          <Crown className="h-4 w-4" />
                          <span>Go Premium / 50% Off</span>
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Metrics strip - Exactly like reference */}
                <div
                  className={`mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 ${isLoaded ? 'animate-fade-in-up' : ''}`}
                >
                  <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 backdrop-blur hover:bg-white/90 hover:scale-105 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                    <div className="text-sm font-medium text-neutral-600">Members</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 group-hover:text-[#006681] transition-colors duration-300">
                      1.2k+
                    </div>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 backdrop-blur hover:bg-white/90 hover:scale-105 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                    <div className="text-sm font-medium text-neutral-600">Events</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 group-hover:text-[#05ef62] transition-colors duration-300">
                      48
                    </div>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 backdrop-blur hover:bg-white/90 hover:scale-105 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                    <div className="text-sm font-medium text-neutral-600">Experts</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 group-hover:text-[#29cf9f] transition-colors duration-300">
                      36+
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column - Exactly like reference */}
              <div
                className={`order-1 lg:order-2 lg:col-span-6 ${isLoaded ? 'animate-slide-in-right' : ''}`}
              >
                <div className="relative">
                  <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-full border border-white/60 bg-white/80 shadow-lg backdrop-blur hover:scale-105 hover:shadow-2xl hover:border-[#29cf9f]/60 transition-all duration-500 group">
                    <img
                      src={heroImage}
                      alt="Community meetup"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="eager"
                      fetchpriority="high"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/60"></div>
                    <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-[#05ef62]/25 via-[#29cf9f]/20 to-[#00fdc2]/20 mix-blend-overlay"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Upcoming Events Section */}
          <section className="relative w-full rounded-[28px] border border-neutral-200 bg-neutral-50 p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-8">
            {/* Background patterns - Exactly like reference */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent"></div>
              <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent"></div>
              <div className="absolute top-0 bottom-0 left-1/3 w-px bg-gradient-to-b from-transparent via-neutral-300 to-transparent"></div>
              <div className="absolute top-0 bottom-0 right-1/3 w-px bg-gradient-to-b from-transparent via-neutral-300 to-transparent"></div>
            </div>

            <div className="relative z-10 mx-auto max-w-3xl text-center">
              <span className="text-sm font-normal text-neutral-500">Homepage</span>
              <h2 className="text-[44px] sm:text-6xl lg:text-7xl leading-[0.95] text-neutral-900 mt-2 tracking-tight">
                Upcoming Events
              </h2>
            </div>

            {/* Enhanced Events Grid */}
            <div className="relative z-10 mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                [1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-lg animate-pulse"
                  >
                    <div className="relative aspect-[300/157] w-full overflow-hidden rounded-lg mb-4 bg-gray-300"></div>
                    <div className="mb-2 h-6 rounded bg-gray-300"></div>
                    <div className="mb-2 h-4 rounded bg-gray-300"></div>
                    <div className="h-4 w-3/4 rounded bg-gray-300"></div>
                  </div>
                ))
              ) : error ? (
                <div className="col-span-full py-12 text-center">
                  <p className="text-lg text-red-500">
                    We couldn't load events right now. Please try again later.
                  </p>
                </div>
              ) : displayEvents.length > 0 ? (
                displayEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    showFavoriteButton
                    onCardClick={() => {
                      const trackedItem = eventListItems[index];
                      if (shouldTrackDiscoveryLists && trackedItem) {
                        trackSelectItem(
                          EVENTS_LIST_CONTEXT.listId,
                          EVENTS_LIST_CONTEXT.listName,
                          trackedItem,
                        );
                      }
                    }}
                  />
                ))
              ) : (
                <div className="col-span-full py-12 text-center">
                  <p className="text-lg text-gray-500">No upcoming meetups at the moment.</p>
                  <p className="text-gray-400">Check back soon for new events!</p>
                </div>
              )}
            </div>

            {/* Load More Trigger */}
            {displayEvents.length < events.length && (
              <div ref={loadMoreRef} className="flex justify-center mt-8">
                <div className="animate-pulse rounded-full bg-neutral-200 h-8 w-8"></div>
              </div>
            )}
          </section>

          {/* Learning Tracks Section - Only show if tracks exist */}
          {!tracksLoading && tracks.length > 0 && (
            <section className="relative w-full rounded-[28px] border border-neutral-200 bg-neutral-50 p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-8">
              {/* Background patterns - Same as events */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent"></div>
                <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent"></div>
                <div className="absolute top-0 bottom-0 left-1/3 w-px bg-gradient-to-b from-transparent via-neutral-300 to-transparent"></div>
                <div className="absolute top-0 bottom-0 right-1/3 w-px bg-gradient-to-b from-transparent via-neutral-300 to-transparent"></div>
              </div>

              <div className="relative z-10 mx-auto max-w-3xl text-center">
                <span className="text-sm font-normal text-neutral-500">Structured Learning</span>
                <h2 className="text-[44px] sm:text-6xl lg:text-7xl leading-[0.95] text-neutral-900 mt-2 tracking-tight">
                  Learning Tracks
                </h2>
              </div>

              {/* Tracks Grid */}
              <div className="relative z-10 mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {tracks.map((track, index) => (
                  <PublicTrackCard
                    key={track.id}
                    track={track}
                    onCardClick={() => {
                      const trackedItem = trackListItems[index];
                      if (shouldTrackDiscoveryLists && trackedItem) {
                        trackSelectItem(
                          TRACKS_LIST_CONTEXT.listId,
                          TRACKS_LIST_CONTEXT.listName,
                          trackedItem,
                        );
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* What You Get FREE Section */}
          <section className="relative w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-white p-6 sm:p-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-sm font-normal text-neutral-500">No Payment Required</span>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                Start Learning Today: For Free
              </h2>
              <p className="mt-3 text-sm text-neutral-600">
                Our free membership isn't a teaser. It's a complete learning experience.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleFreeFeatures.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#05ef62]/10">
                    <item.icon className="h-5 w-5 text-[#05ef62]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-neutral-900">{item.title}</h3>
                    <p className="text-sm text-neutral-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Button
                className="group inline-flex items-center gap-2 transform rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-6 py-3.5 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
                asChild
              >
                <Link to="/signup">
                  Join Free: Get Instant Access
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>

          {/* What You Get at Every Level - Timeline Section */}
          <section className="relative w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-white content-visibility-auto">
            {/* Section Header */}
            <div className="px-6 sm:px-10 pt-12 pb-8">
              <div className="mx-auto max-w-3xl text-center">
                <span className="text-sm font-normal text-neutral-500">Your Growth Journey</span>
                <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
                  {canAccessSubscriptionPages
                    ? 'What You Get at Every Level'
                    : 'What You Get With Membership'}
                </h2>
                <p className="mt-3 text-sm text-neutral-600">
                  {canAccessSubscriptionPages
                    ? "Whether you start free or go premium, here's what's waiting for you."
                    : "Here's what members can access right now."}
                </p>
              </div>
            </div>

            {/* Benefits Container with Timeline */}
            <div className="px-6 sm:px-10 pb-12">
              {/* Timeline wrapper - relative container for the vertical line */}
              <div className="relative">
                {/* Timeline line - gradient from green to amber */}
                <div className="absolute left-[23px] sm:left-[27px] top-0 bottom-0 w-[3px] overflow-hidden">
                  <div className="h-[52%] bg-[#05ef62]/30" />
                  <div className="h-[48%] bg-gradient-to-b from-[#05ef62]/30 via-amber-300/40 to-amber-400/30" />
                </div>

                {/* Benefits List */}
                <div className="space-y-12 sm:space-y-16">
                  {visibleBenefitItems.map((benefit, index) => {
                    const Icon = benefit.icon;
                    const isPremium = benefit.isPremium;

                    return (
                      <div key={benefit.id}>
                        {/* Timeline Transition Point - Insert after index 2 (item 03) */}
                        {canAccessSubscriptionPages && index === 3 && (
                          <div className="relative py-6 sm:py-8 mb-12 sm:mb-16">
                            {/* Transition card */}
                            <div className="ml-16 lg:ml-0 relative overflow-hidden rounded-3xl border border-neutral-200/60 bg-gradient-to-r from-[#05ef62]/8 via-white/95 to-amber-50/70 p-5 sm:p-7 shadow-xl shadow-neutral-900/[0.04]">
                              {/* Decorative gradient line at top */}
                              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#05ef62] via-emerald-400 to-amber-400" />

                              {/* Subtle corner glow */}
                              <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
                              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#05ef62]/10 rounded-full blur-3xl pointer-events-none" />

                              <div className="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                                {/* Left - Foundation complete badge */}
                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#05ef62]/30 to-[#05ef62]/15 ring-1 ring-[#05ef62]/25 shadow-sm">
                                    <CheckCircle2 className="h-5 w-5 text-[#05ef62]" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.15em]">
                                      Complete
                                    </span>
                                    <span className="text-sm font-bold text-[#05ef62]">
                                      Foundation
                                    </span>
                                  </div>
                                </div>

                                {/* Divider - visible on desktop */}
                                <div className="hidden sm:block w-px h-10 bg-gradient-to-b from-transparent via-neutral-200 to-transparent" />

                                {/* Center - Message */}
                                <div className="flex-1 text-center sm:text-left">
                                  <p className="text-sm sm:text-[15px] leading-relaxed text-neutral-600">
                                    <span className="font-semibold text-neutral-800">
                                      You have the essentials.
                                    </span>
                                    <span className="hidden sm:inline text-neutral-300 mx-2">
                                      |
                                    </span>
                                    <br className="sm:hidden" />
                                    <span className="sm:hidden text-xs text-neutral-400 block mt-1">
                                      Ready for more?
                                    </span>
                                    <span className="hidden sm:inline">
                                      Ready for{' '}
                                      <span className="font-semibold text-amber-600">
                                        specialization
                                      </span>
                                      ?
                                    </span>
                                  </p>
                                </div>

                                {/* Right - Premium CTA */}
                                <Link
                                  to="/subscribe"
                                  className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:from-amber-500 hover:to-amber-500 hover:shadow-xl hover:shadow-amber-500/25 hover:-translate-y-0.5 transition-all duration-200 shrink-0"
                                >
                                  <Crown className="h-4 w-4" />
                                  <span>Go Premium</span>
                                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
                          <div className="lg:col-span-5 flex gap-4">
                            {/* Numbered badge with conditional styling */}
                            <div className="relative z-10 flex-shrink-0">
                              <div
                                className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-[3px] bg-white text-lg sm:text-xl font-semibold shadow-sm ${
                                  isPremium
                                    ? 'border-amber-400 text-amber-500'
                                    : 'border-[#05ef62] text-[#05ef62]'
                                }`}
                              >
                                {benefit.id}
                              </div>
                            </div>

                            <div className="pt-2 sm:pt-3">
                              {/* Title with optional PREMIUM badge */}
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg sm:text-xl font-semibold text-neutral-900">
                                  {benefit.title}
                                </h3>
                                {isPremium && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                    <Crown className="h-3 w-3" />
                                    PREMIUM
                                  </span>
                                )}
                              </div>

                              {/* Points with conditional check color */}
                              <ul className="mt-4 space-y-3">
                                {benefit.points.map((point) => (
                                  <li key={point} className="flex items-start gap-2.5">
                                    <CheckCircle2
                                      className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                                        isPremium ? 'text-amber-500' : 'text-[#05ef62]'
                                      }`}
                                    />
                                    <span className="text-sm text-neutral-600 leading-relaxed">
                                      {point}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="lg:col-span-7 ml-16 lg:ml-0">
                            <div className={benefit.mediaClassName}>
                              <Icon className={benefit.iconClassName} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* CTA Band */}
          <section className="relative w-full overflow-hidden rounded-[28px] content-visibility-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#0b3a3f]"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-blue-900/10 to-transparent"></div>
            <div className="relative px-6 sm:px-10 py-12 text-center">
              <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Start Your Marketing Journey Today
              </h3>
              <p className="mt-2 text-sm text-white/70 max-w-2xl mx-auto">
                {canAccessSubscriptionPages
                  ? "Whether you choose free or premium, you're joining 1,200+ marketers who are leveling up together."
                  : 'Join 1,200+ marketers who are leveling up together.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button
                  className="group inline-flex items-center gap-2 transform rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-5 py-3 text-sm font-medium text-[#101010] transition-all duration-300 hover:brightness-95 hover:scale-105 hover:shadow-lg"
                  asChild
                >
                  <Link to="/signup">Join Free</Link>
                </Button>
                {canAccessSubscriptionPages && (
                  <Button
                    className="group inline-flex items-center gap-2 transform rounded-xl border-2 border-amber-400/50 bg-amber-50/10 px-5 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-amber-50/20 hover:scale-105 hover:shadow-lg"
                    asChild
                  >
                    <Link to="/subscribe">
                      <Crown className="h-4 w-4" />
                      Go Premium: Launch Pricing
                    </Link>
                  </Button>
                )}
              </div>
              {canAccessSubscriptionPages && (
                <p className="mt-4 text-xs text-white/50">
                  Free membership is genuinely valuable. Premium is for those ready to specialize.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
