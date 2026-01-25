import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Calendar, Library, MessageSquare, Mic, Sparkles, Users2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { type EventRecord, fetchEvents } from '@/app/api/events';
import { EventCard } from '@/features/events/components/EventCard';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';
import { useErrorHandler } from '@/shared/utils/errorHandling';

const Index: React.FC = () => {
  const { handleError } = useErrorHandler();
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

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleEvents < events.length) {
          setVisibleEvents((prev) => Math.min(prev + 3, events.length));
        }
      },
      { threshold: 0.1 },
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [visibleEvents, events.length]);

  // Mark component as loaded for animations
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const displayEvents = events.slice(0, visibleEvents);

  return (
    <Layout>
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -left-[45vw] top-[-25vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/70 via-[#f4fff9]/40 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -right-[50vw] top-[30vh] -z-10 h-[50vh] w-[80vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[140px]" />

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
                  <div
                    className={`mb-5 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-medium text-neutral-700 backdrop-blur hover:bg-white/80 transition-all duration-300 hover:scale-105 hover:shadow-lg ${isLoaded ? 'animate-bounce' : ''}`}
                  >
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
                    Where MENA's Marketers Grow
                  </h1>

                  <p
                    className={`mt-5 max-w-lg text-base leading-relaxed text-neutral-700 ${isLoaded ? 'animate-fade-in-up' : ''}`}
                  >
                    TrafficMENA connects marketers with experts through meetups, workshops, and an
                    exclusive content library focused on the Middle East and North Africa.
                  </p>

                  <div
                    className={`mt-8 flex flex-wrap gap-3 items-center ${isLoaded ? 'animate-fade-in-up' : ''}`}
                  >
                    <Button
                      className="group flex gap-2 transform rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-6 py-3.5 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95"
                      asChild
                    >
                      <Link to="/meetups">
                        <Users2 className="h-4 w-4" />
                        <span>Join the Community</span>
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="group inline-flex gap-2 transform rounded-xl border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition-all duration-300 hover:scale-105 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                      asChild
                    >
                      <Link to="/events">
                        <Calendar className="h-4 w-4" />
                        <span>See Upcoming Events</span>
                      </Link>
                    </Button>
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
                    <div className="text-sm font-medium text-neutral-600">Cities</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 group-hover:text-[#29cf9f] transition-colors duration-300">
                      7
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
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/60"></div>
                    <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-[#05ef62]/25 via-[#29cf9f]/20 to-[#00fdc2]/20 mix-blend-overlay animate-pulse"></div>
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
                Upcoming Events & Core Value Propositions
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
                displayEvents.map((event) => (
                  <EventCard key={event.id} event={event} showFavoriteButton />
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

          {/* Why Choose TrafficMENA */}
          <section className="relative w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-white">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/[0.06] via-transparent to-transparent"></div>
              <div className="absolute inset-0 opacity-10"></div>
            </div>

            <div className="relative px-6 sm:px-10 py-12">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
                  Why Choose TrafficMENA?
                </h2>
                <p className="mt-3 text-sm text-neutral-600">
                  Focused on real outcomes for marketers across the MENA region.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-neutral-900/80 text-white flex items-center justify-center ring-1 ring-white/10 shadow">
                      <Mic className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium tracking-tight text-neutral-900">
                        Expert-Led Meetups
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                        Learn from leaders through interactive meetups made for the MENA market.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-neutral-900/80 text-white flex items-center justify-center ring-1 ring-white/10 shadow">
                      <Library className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium tracking-tight text-neutral-900">
                        Exclusive Content Library
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                        Access recordings, templates, and playbooks from past workshops.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-neutral-900/80 text-white flex items-center justify-center ring-1 ring-white/10 shadow">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium tracking-tight text-neutral-900">
                        Community Support
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                        Get practical help from peers and mentors across the region.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Band */}
          <section className="relative w-full overflow-hidden rounded-[28px]">
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#0b3a3f]"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-blue-900/10 to-transparent"></div>
            <div className="relative px-6 sm:px-10 py-12 text-center">
              <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Ready to Join the Community?
              </h3>
              <p className="mt-2 text-sm text-white/70 max-w-2xl mx-auto">
                Connect with like‑minded professionals, expand your network, and stay ahead in the
                digital marketing landscape.
              </p>
              <div className="mt-6">
                <Button
                  className="group inline-flex items-center gap-2 transform rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-5 py-3 text-sm font-medium text-[#101010] transition-all duration-300 hover:brightness-95 hover:scale-105 hover:shadow-lg"
                  asChild
                >
                  <Link to="/meetups">
                    Explore Events
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Logos / Social proof */}
          <section className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-y-6 pt-10 pb-10 sm:py-12">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 text-neutral-500">
              <span className="text-xs font-medium">Supported by marketing leaders</span>
              <div className="h-5 w-px bg-neutral-200"></div>
              <span className="text-sm font-medium">MENA Growth Guild</span>
              <span className="text-sm font-medium">GCC Marketers</span>
              <span className="text-sm font-medium">AdTech Labs</span>
              <span className="text-sm font-medium">Data & CRM Collective</span>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
