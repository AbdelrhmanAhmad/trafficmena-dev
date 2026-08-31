import { BookOpen, Calendar } from 'lucide-react';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PublicTrackCard } from '@/features/tracks/components/PublicTrackCard';
import { usePublicTracks } from '@/features/tracks/hooks/useTracks';
import {
  buildTrackDiscoveryItem,
  isCanonicalDiscoveryListPath,
  TRACKS_LIST_CONTEXT,
  useTrackedItemListView,
} from '@/lib/analytics/contentDiscovery';
import { trackSelectItem } from '@/lib/analytics/events';
import DataLoader from '@/shared/components/DataLoader';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';
import { prepareSignInFromCurrentPage } from '@/shared/utils/authNavigation';
import { Card, CardContent } from '@/shared/components/ui/card';

const PAGE_SIZE = 12;

const PublicTracksPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const goToSignIn = useCallback(() => {
    navigate('/signin', prepareSignInFromCurrentPage(location));
  }, [location, navigate]);
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading, error } = usePublicTracks(currentPage, PAGE_SIZE);

  const items = data?.items ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const trackListItems = useMemo(
    () => items.map((track, index) => buildTrackDiscoveryItem(track, index)),
    [items],
  );
  const shouldTrackDiscoveryLists = isCanonicalDiscoveryListPath(location.pathname);

  useTrackedItemListView(TRACKS_LIST_CONTEXT, trackListItems, {
    enabled: shouldTrackDiscoveryLists,
  });

  const handleTrackClick = useCallback(
    (trackId: string) => {
      navigate(`/tracks/${trackId}`);
    },
    [navigate],
  );

  return (
    <Layout>
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -left-[45vw] top-[-25vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/70 via-[#f4fff9]/40 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -right-[50vw] bottom-[-30vh] -z-10 h-[55vh] w-[80vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[90px]" />

        <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 pb-20 pt-12 sm:px-6 lg:px-0">
          <section className="w-full rounded-[28px] border border-neutral-200 bg-white/90 px-6 py-10 text-center shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur sm:px-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-medium text-neutral-600">
              <BookOpen className="h-3.5 w-3.5 text-purple-500" />
              TrafficMENA Tracks
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
              Master Skills Together
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-neutral-700">
              Deep-dive programs with multiple sessions. Book once, learn it all — workshops and
              learning paths built for marketers across the MENA region.
            </p>
          </section>

          <section className="relative w-full rounded-[28px] border border-neutral-200 bg-neutral-50 p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-10">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Learning Tracks
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                Available Tracks
              </h2>
              {data && (
                <p className="mt-1 text-sm text-neutral-500">
                  Showing {items.length} of {total} tracks
                </p>
              )}
            </div>

            <div className="mt-10">
              <DataLoader
                loading={isLoading}
                error={error ? 'Failed to load tracks' : null}
                loadingText="Loading tracks..."
                onRetry={() => window.location.reload()}
              >
                {items.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                      {items.map((track, index) => (
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

                    {totalPages > 1 && (
                      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                        <p className="text-sm text-neutral-500">
                          Page {currentPage} of {totalPages}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <Card className="border-dashed border-neutral-200 bg-white/80">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <Calendar className="mb-4 h-12 w-12 text-neutral-400" />
                      <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                        No tracks available
                      </h3>
                      <p className="max-w-sm text-sm text-neutral-600">
                        Check back soon for new learning tracks and multi-session programs.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </DataLoader>
            </div>
          </section>

          <section className="relative w-full overflow-hidden rounded-[28px]">
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#0b3a3f]" />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-transparent" />
            <div className="relative px-6 py-12 text-center sm:px-10">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Ready to book a full track?
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-white/70">
                Sign in to reserve your spot, follow every session, and grow with the TrafficMENA
                community.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-5 py-3 text-sm font-medium text-[#101010] transition-all hover:brightness-95"
                  onClick={() => navigate('/signup')}
                >
                  Sign up free
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
                  onClick={goToSignIn}
                >
                  Sign in
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default PublicTracksPage;
