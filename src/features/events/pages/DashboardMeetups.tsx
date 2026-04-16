import { ArrowRight, BookOpen, Calendar, Sparkles } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
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
import AppLayout from '@/shared/components/layout/AppLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/shared/context/AuthContext';
import { EventCard } from '../components/EventCard';
import { useUpcomingEventsList } from '../hooks/useEventBooking';

const DashboardMeetups: React.FC = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: upcoming, isLoading, error } = useUpcomingEventsList(9);
  const { data: tracksData } = usePublicTracks(1, 6);
  const visibleTracks = useMemo(() => tracksData?.items.slice(0, 3) ?? [], [tracksData?.items]);
  const eventListItems = useMemo(
    () => (upcoming?.items ?? []).map((event, index) => buildEventDiscoveryItem(event, index)),
    [upcoming?.items],
  );
  const trackListItems = useMemo(
    () => visibleTracks.map((track, index) => buildTrackDiscoveryItem(track, index)),
    [visibleTracks],
  );
  const shouldTrackDiscoveryLists = isCanonicalDiscoveryListPath(pathname);

  useTrackedItemListView(EVENTS_LIST_CONTEXT, eventListItems, {
    enabled: shouldTrackDiscoveryLists,
  });
  useTrackedItemListView(TRACKS_LIST_CONTEXT, trackListItems, {
    enabled: shouldTrackDiscoveryLists,
  });

  return (
    <ProtectedRoute>
      <AppLayout variant="member">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-0">
          {/* Hero Header */}
          <div className="relative mb-8 overflow-hidden rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-white/95 p-6 sm:p-8 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#d5ffe9]/10 via-transparent to-[#f4fff9]/5" />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62] to-[#29cf9f] text-white shadow-lg">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">
                    Events & Tracks
                  </h1>
                  <p className="text-sm sm:text-base text-neutral-600 mt-0.5">
                    Your learning journey starts here
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/meetups')}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-5 py-2.5 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:shadow-xl hover:brightness-95"
              >
                Browse All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DataLoader
            loading={isLoading}
            error={error ? 'Failed to load upcoming events' : null}
            loadingText="Loading your events..."
          >
            <div className="space-y-8">
              {/* Learning Tracks Section */}
              {tracksData && tracksData.items.length > 0 && (
                <section className="relative overflow-hidden rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/50 p-5 sm:p-8 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.35)]">
                  {/* Decorative elements */}
                  <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-purple-200/30 to-indigo-200/20 blur-3xl" />
                  <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-gradient-to-tr from-indigo-200/20 to-purple-200/10 blur-2xl" />

                  <div className="relative z-10">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-white/80 px-3 py-1 text-xs font-medium text-purple-700 shadow-sm">
                            <Sparkles className="h-3 w-3" />
                            Featured
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
                          Learning Tracks
                        </h2>
                        <p className="mt-1 text-sm text-neutral-600">
                          Multi-session programs to master marketing skills
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/meetups')}
                        className="hidden sm:flex items-center gap-1.5 rounded-xl border-purple-200 bg-white/80 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                      >
                        <BookOpen className="h-4 w-4" />
                        View All Tracks
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                      {visibleTracks.map((track, index) => (
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
                          onClick={() => navigate(`/tracks/${track.id}`)}
                        />
                      ))}
                    </div>

                    {/* Mobile view all button */}
                    <div className="mt-5 sm:hidden">
                      <Button
                        variant="outline"
                        onClick={() => navigate('/meetups')}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border-purple-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-purple-700 hover:bg-purple-50"
                      >
                        <BookOpen className="h-4 w-4" />
                        View All Tracks
                      </Button>
                    </div>
                  </div>
                </section>
              )}

              {/* Upcoming Events Section */}
              {upcoming && upcoming.items.length > 0 ? (
                <section className="relative overflow-hidden rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-white/95 p-5 sm:p-8 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.35)] backdrop-blur">
                  {/* Subtle grid pattern */}
                  <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
                    <div className="absolute left-1/4 top-0 bottom-0 w-px bg-neutral-900" />
                    <div className="absolute right-1/4 top-0 bottom-0 w-px bg-neutral-900" />
                    <div className="absolute left-0 right-0 top-1/3 h-px bg-neutral-900" />
                    <div className="absolute left-0 right-0 bottom-1/3 h-px bg-neutral-900" />
                  </div>

                  <div className="relative z-10">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#05ef62]/30 bg-gradient-to-r from-[#d5ffe9]/50 to-[#f4fff9]/50 px-3 py-1 text-xs font-medium text-[#0d7a3e] shadow-sm">
                            <Calendar className="h-3 w-3" />
                            Upcoming
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
                          Community Events
                        </h2>
                        <p className="mt-1 text-sm text-neutral-600">
                          {user
                            ? "What's coming up next for the community"
                            : 'Events you can join right now'}
                        </p>
                      </div>
                      <p className="text-xs text-neutral-500 sm:text-sm">
                        Showing {upcoming.items.length} upcoming{' '}
                        {upcoming.items.length === 1 ? 'event' : 'events'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                      {upcoming.items.map((event, index) => (
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
                          onViewDetails={(e) => navigate(`/meetups/${e.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                </section>
              ) : (
                <section className="relative overflow-hidden rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-white/95 p-5 sm:p-8 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.35)] backdrop-blur">
                  <div className="py-8 sm:py-12 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#f4fff9]/60 to-[#d5ffe9]/30">
                      <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-[#05ef62]" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                      No Upcoming Events
                    </h3>
                    <p className="mx-auto mb-6 max-w-sm text-sm text-neutral-600">
                      There are no upcoming events scheduled right now. Check back soon for new
                      workshops and meetups.
                    </p>
                    <Button
                      onClick={() => navigate('/meetups')}
                      className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-5 py-2.5 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:shadow-xl hover:brightness-95"
                    >
                      Browse All Events
                    </Button>
                  </div>
                </section>
              )}
            </div>
          </DataLoader>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default DashboardMeetups;
