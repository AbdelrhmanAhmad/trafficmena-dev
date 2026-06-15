import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { BookOpen, Calendar, FileText, FolderOpen, MapPin, Sparkles, Users } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchEvents } from '@/app/api/events';
import { fetchLibraryAssets } from '@/app/api/library';
import { fetchSeries } from '@/app/api/series';
import SeriesPriceBadge from '@/features/series/components/SeriesPriceBadge';
import { fetchTracks } from '@/app/api/tracks';
import AppLayout from '@/shared/components/layout/AppLayout';
import { SubscriptionStatusBadge } from '@/shared/components/payment';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';

const WelcomeDashboard: React.FC = () => {
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: ['welcome-events'],
    queryFn: async () => {
      const response = await fetchEvents({ page: 1, pageSize: 3, upcoming: true });
      return response.items;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: assetsData,
    isLoading: assetsLoading,
    error: assetsError,
  } = useQuery({
    queryKey: ['welcome-library-assets-single'],
    queryFn: async () => {
      const response = await fetchLibraryAssets({ page: 1, pageSize: 3, excludeInTracks: true });
      return response.items;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const events = eventsData ?? [];
  const assets = assetsData ?? [];

  const {
    data: tracksData,
    isLoading: tracksLoading,
    error: tracksError,
  } = useQuery({
    queryKey: ['welcome-tracks'],
    queryFn: async () => {
      const response = await fetchTracks({ page: 1, pageSize: 3 });
      return response.items;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: seriesData,
    isLoading: seriesLoading,
    error: seriesError,
  } = useQuery({
    queryKey: ['welcome-series'],
    queryFn: async () => {
      const response = await fetchSeries({ page: 1, pageSize: 3 });
      return response.items;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const tracks = tracksData ?? [];
  const series = seriesData ?? [];
  const singleContent = useMemo(
    () =>
      [...assets].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [assets],
  );

  const formatDate = (value: string | null | undefined) => {
    if (!value) return 'Date TBA';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Date TBA';
    return parsed.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const sanitizeConfig = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
    ALLOWED_ATTR: [],
  };

  const getPlainText = (value: string | null | undefined) => {
    if (!value) return '';
    const sanitized = DOMPurify.sanitize(value, sanitizeConfig);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sanitized;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  return (
    <AppLayout variant="member">
      <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8">
        <section className="relative w-full overflow-hidden rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-gradient-to-br from-[#d5ffe9]/30 via-[#f4fff9]/20 to-[#00fdc2]/10 p-6 sm:p-8 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
          <div className="pointer-events-none absolute -left-1/4 -top-1/4 -z-10 h-[40%] w-[60%] rounded-full bg-gradient-to-br from-[#d5ffe9]/50 via-[#f4fff9]/30 to-transparent blur-3xl" />
          <div className="pointer-events-none absolute -right-1/4 -bottom-1/4 -z-10 h-[40%] w-[50%] rounded-full bg-gradient-to-tr from-[#00fdc2]/20 via-[#05ef62]/15 to-transparent blur-[80px]" />

          <div className="relative z-10 space-y-4 text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62] to-[#29cf9f] text-white">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="text-4xl font-bold text-neutral-900">Welcome to TrafficMENA</h1>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#29cf9f] to-[#00fdc2] text-white">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
            <p className="mx-auto max-w-2xl text-lg text-neutral-700">
              Glad to have you here. Explore upcoming events and dive into the knowledge library to
              sharpen your marketing edge across the MENA region.
            </p>
            <div className="flex justify-center pt-2">
              <SubscriptionStatusBadge />
            </div>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <CardHeader className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62] to-[#29cf9f] text-white shadow-lg">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <CardTitle className="text-lg sm:text-xl text-neutral-900">
                  Upcoming Events
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
              <div className="space-y-3">
                {eventsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : eventsError ? (
                  <p className="text-sm text-destructive">
                    Unable to load upcoming events right now.
                  </p>
                ) : events.length > 0 ? (
                  events.map((event) => (
                    <Link key={event.id} to={`/meetups/${event.id}`} className="block">
                      <div className="rounded-2xl border border-neutral-200 bg-white/90 p-4 text-left transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-lg hover:border-[#05ef62]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05ef62]/40">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2">
                            {event.title}
                          </h3>
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20 flex-shrink-0 ml-2">
                            <Calendar className="h-4 w-4 text-[#05ef62]" />
                          </div>
                        </div>
                        <p className="mt-1 flex items-center gap-2 text-xs text-neutral-600">
                          <Calendar className="h-3 w-3" />
                          {formatDate(event.date)}
                        </p>
                        {event.location ? (
                          <p className="mt-1 flex items-center gap-2 text-xs text-neutral-600">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </p>
                        ) : (
                          <p className="mt-1 flex items-center gap-2 text-xs text-neutral-600">
                            <Users className="h-3 w-3" />
                            Online Event
                          </p>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <Badge className="rounded-full border border-[#05ef62]/60 bg-[#05ef62]/10 text-[#05ef62] px-2 py-1 text-[10px] font-medium">
                            {event.event_type}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-neutral-600">
                    No upcoming events yet. Check back soon or create your first meetup.
                  </p>
                )}
              </div>
              <Button
                className="self-start rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-4 py-2 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95"
                variant="default"
                asChild
              >
                <Link to="/meetups">Browse Events</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <CardHeader className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#29cf9f] to-[#00fdc2] text-white shadow-lg">
                  <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <CardTitle className="text-lg sm:text-xl text-neutral-900">
                  Learning Tracks
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
              <div className="space-y-3">
                {tracksLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : tracksError ? (
                  <p className="text-sm text-destructive">Unable to load tracks right now.</p>
                ) : tracks.length > 0 ? (
                  tracks.map((track) => (
                    <Link key={track.id} to={`/tracks/${track.id}`} className="block">
                      <div className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-4 text-left transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-lg hover:border-[#29cf9f]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#29cf9f]/40">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2">
                            {track.title}
                          </h3>
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#f4fff9]/40 to-[#d5ffe9]/20 flex-shrink-0 ml-2">
                            <FolderOpen className="h-4 w-4 text-[#29cf9f]" />
                          </div>
                        </div>
                        {track.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
                            {getPlainText(track.description)}
                          </p>
                        ) : null}
                        <div className="mt-3 flex items-center gap-2">
                          <Badge className="rounded-full border border-[#29cf9f]/60 bg-[#29cf9f]/10 text-[#29cf9f] px-2 py-1 text-[10px] font-medium">
                            {track.event_count} {track.event_count === 1 ? 'Event' : 'Events'}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-neutral-600">
                    Tracks will appear here as soon as they&apos;re published.
                  </p>
                )}
              </div>
              <Button
                className="self-start rounded-xl bg-gradient-to-r from-[#29cf9f] to-[#00fdc2] px-4 py-2 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95"
                variant="default"
                asChild
              >
                <Link to="/meetups">Browse Tracks</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <CardHeader className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] text-white shadow-lg">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <CardTitle className="text-lg sm:text-xl text-neutral-900">Series</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
              <div className="space-y-3">
                {seriesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : seriesError ? (
                  <p className="text-sm text-destructive">Unable to load series right now.</p>
                ) : series.length > 0 ? (
                  series.map((item) => (
                    <Link
                      key={item.id}
                      to={`/dashboard/library/series/${item.id}`}
                      className="block"
                    >
                      <div className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-4 text-left transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-lg hover:border-[#6366f1]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/40">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2">
                            {item.title}
                          </h3>
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#ede9fe]/60 to-[#e0e7ff]/30 flex-shrink-0 ml-2">
                            <BookOpen className="h-4 w-4 text-[#6366f1]" />
                          </div>
                        </div>
                        {item.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
                            {getPlainText(item.description)}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge className="rounded-full border border-[#6366f1]/60 bg-[#6366f1]/10 text-[#6366f1] px-2 py-1 text-[10px] font-medium">
                            {item.asset_count} {item.asset_count === 1 ? 'Item' : 'Items'}
                          </Badge>
                          <SeriesPriceBadge series={item} className="px-2 py-1 text-[10px] font-medium" />
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-neutral-600">
                    Series will appear here as soon as they&apos;re published.
                  </p>
                )}
              </div>
              <Button
                className="self-start rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95"
                variant="default"
                asChild
              >
                <Link to="/dashboard/library">View Series</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <CardHeader className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#10b981] to-[#34d399] text-white shadow-lg">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <CardTitle className="text-lg sm:text-xl text-neutral-900">
                  Single Content
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
              <div className="space-y-3">
                {assetsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : assetsError ? (
                  <p className="text-sm text-destructive">
                    Unable to load single content right now.
                  </p>
                ) : singleContent.length > 0 ? (
                  singleContent.map((asset) => (
                    <Link key={asset.id} to={`/dashboard/library/${asset.id}`} className="block">
                      <div className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-4 text-left transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-lg hover:border-[#10b981]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]/40">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2">
                            {asset.title}
                          </h3>
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20 flex-shrink-0 ml-2">
                            <FileText className="h-4 w-4 text-[#10b981]" />
                          </div>
                        </div>
                        {asset.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
                            {getPlainText(asset.description)}
                          </p>
                        ) : null}
                        <div className="mt-3 flex items-center gap-2">
                          <Badge className="rounded-full border border-[#10b981]/60 bg-[#10b981]/10 text-[#10b981] px-2 py-1 text-[10px] font-medium">
                            {asset.file_type}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-neutral-600">
                    Single content will appear here once available.
                  </p>
                )}
              </div>
              <Button
                className="self-start rounded-xl bg-gradient-to-r from-[#10b981] to-[#34d399] px-4 py-2 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95"
                variant="default"
                asChild
              >
                <Link to="/dashboard/library">View Library</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default WelcomeDashboard;
