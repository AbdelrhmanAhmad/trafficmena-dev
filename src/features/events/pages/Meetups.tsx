import { BookOpen, Calendar } from 'lucide-react';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PublicTrackCard } from '@/features/tracks/components/PublicTrackCard';
import { usePublicTracks } from '@/features/tracks/hooks/useTracks';
import {
  buildEventDiscoveryItem,
  buildTrackDiscoveryItem,
  EVENTS_LIST_CONTEXT,
  isCanonicalDiscoveryListPath,
  TRACKS_LIST_CONTEXT,
  useTrackedItemListView,
} from '@/lib/analytics/contentDiscovery';
import { trackSelectItem } from '@/lib/analytics/events';
import DataLoader from '@/shared/components/DataLoader';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { EventCard } from '../components/EventCard';
import { useEvents } from '../hooks/useEvents';
import type { Event, EventFilters } from '../types';

const EventsPage: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<EventFilters>({
    upcoming_only: true,
  });

  const itemsPerPage = 12;
  const { data, isLoading, error } = useEvents(currentPage, itemsPerPage, filters);
  const { data: tracksData } = usePublicTracks(1, 6);

  const handleEventClick = useCallback(
    (event: Event) => {
      navigate(`/meetups/${event.id}`);
    },
    [navigate],
  );

  const handleTrackClick = useCallback(
    (trackId: string) => {
      navigate(`/tracks/${trackId}`);
    },
    [navigate],
  );

  const toggleUpcomingFilter = () => {
    setFilters((prev) => ({
      ...prev,
      upcoming_only: !prev.upcoming_only,
    }));
    setCurrentPage(1);
  };

  const totalPages = Math.ceil((data?.total || 0) / itemsPerPage);

  const eventListItems = useMemo(
    () => (data?.items ?? []).map((event, index) => buildEventDiscoveryItem(event, index)),
    [data?.items],
  );
  const trackListItems = useMemo(
    () => (tracksData?.items ?? []).map((track, index) => buildTrackDiscoveryItem(track, index)),
    [tracksData?.items],
  );
  const shouldTrackDiscoveryLists = isCanonicalDiscoveryListPath(pathname);

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
        <div className="pointer-events-none absolute -right-[50vw] bottom-[-30vh] -z-10 h-[55vh] w-[80vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[90px]" />

        <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 pb-20 pt-12 sm:px-6 lg:px-0">
          {/* Page Header */}
          <section className="w-full rounded-[28px] border border-neutral-200 bg-white/90 px-6 py-10 text-center shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur sm:px-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-medium text-neutral-600">
              <Calendar className="h-3.5 w-3.5 text-[#05ef62]" />
              TrafficMENA Events
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
              Where Marketers Meet & Grow
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-neutral-700">
              Discover upcoming workshops, community meetups, and deep dives built for the MENA
              region. Join live to learn from operators, swap ideas, and grow together.
            </p>
            <div className="mx-auto mt-8 flex w-full flex-wrap justify-center gap-3">
              <Button
                onClick={toggleUpcomingFilter}
                variant={filters.upcoming_only ? 'default' : 'outline'}
                className={`rounded-xl border-neutral-200 px-5 py-2 text-sm font-medium transition-colors ${
                  filters.upcoming_only
                    ? 'bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010] hover:brightness-95'
                    : 'bg-white text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                {filters.upcoming_only ? 'Showing Upcoming Only' : 'Showing All Events'}
              </Button>
            </div>
          </section>

          {/* Learning Tracks Section */}
          {tracksData && tracksData.items.length > 0 && (
            <section className="relative w-full rounded-[28px] border border-neutral-200 bg-white/90 p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-10">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <BookOpen className="h-3.5 w-3.5 text-purple-500" />
                  Learning Tracks
                </span>
                <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                  Master Skills Together
                </h2>
                <p className="text-neutral-600">
                  Deep-dive programs with multiple sessions. Book once, learn it all.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {tracksData.items.map((track, index) => (
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
                    onClick={() => handleTrackClick(track.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Events Grid */}
          <section className="relative w-full rounded-[28px] border border-neutral-200 bg-neutral-50 p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-10">
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />
              <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />
              <div className="absolute top-0 bottom-0 left-1/3 w-px bg-gradient-to-b from-transparent via-neutral-300 to-transparent" />
              <div className="absolute top-0 bottom-0 right-1/3 w-px bg-gradient-to-b from-transparent via-neutral-300 to-transparent" />
            </div>

            <div className="relative z-10">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Meetups
                </span>
                <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                  Upcoming Meetups & Workshops
                </h2>
                {data && (
                  <p className="mt-1 text-sm text-neutral-500">
                    Showing {data.items.length} of {data.total} events
                    {filters.upcoming_only && ' · Upcoming only'}
                  </p>
                )}
              </div>

              <div className="mt-10">
                <DataLoader
                  loading={isLoading}
                  error={error ? 'Failed to load events' : null}
                  loadingText="Loading events..."
                  onRetry={() => window.location.reload()}
                >
                  {data &&
                    (data.items.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                          {data.items.map((event, index) => (
                            <EventCard
                              key={event.id}
                              event={event}
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
                              onViewDetails={handleEventClick}
                            />
                          ))}
                        </div>

                        {totalPages > 1 && (
                          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((prev) => prev - 1)}
                                className="rounded-xl border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
                              >
                                Previous
                              </Button>
                              <Button
                                variant="outline"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((prev) => prev + 1)}
                                className="rounded-xl border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
                              >
                                Next
                              </Button>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                                (pageNum) => (
                                  <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`rounded-full px-4 py-1 text-xs font-medium ${
                                      currentPage === pageNum
                                        ? 'bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010] hover:brightness-95'
                                        : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                                    }`}
                                  >
                                    {pageNum}
                                  </Button>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <Card className="border-dashed border-neutral-200 bg-white/80">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                          <Calendar className="mb-4 h-12 w-12 text-neutral-400" />
                          <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                            No events available
                          </h3>
                          <p className="max-w-sm text-sm text-neutral-600">
                            {filters.upcoming_only
                              ? 'No upcoming events are currently scheduled. Check back soon.'
                              : 'No events found at the moment. Try switching filters or come back later.'}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                </DataLoader>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="relative w-full overflow-hidden rounded-[28px]">
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#0b3a3f]" />
            <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-blue-900/10 to-transparent" />
            <div className="relative px-6 py-12 text-center sm:px-10">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Join the TrafficMENA Community
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-white/70">
                Become part of a fast-moving network of marketers across the region. Access live
                sessions, members-only content, and community support.
              </p>
              <div className="mt-6 flex justify-center">
                <Button
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-5 py-3 text-sm font-medium text-[#101010] transition-all hover:brightness-95"
                  onClick={() => navigate('/signup')}
                >
                  Sign Up for Free
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default EventsPage;
