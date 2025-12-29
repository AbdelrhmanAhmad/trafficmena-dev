import { useQuery } from '@tanstack/react-query';
import { Calendar, FileText, Library, MapPin, Sparkles, Users } from 'lucide-react';
import type React from 'react';
import { fetchEvents } from '@/app/api/events';
import { fetchLibraryAssets } from '@/app/api/library';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
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
    queryKey: ['welcome-library-assets'],
    queryFn: async () => {
      const response = await fetchLibraryAssets({ page: 1, pageSize: 4 });
      return response.items;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const events = eventsData ?? [];
  const assets = assetsData ?? [];

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="relative w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-gradient-to-br from-[#d5ffe9]/30 via-[#f4fff9]/20 to-[#00fdc2]/10 p-8 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
          <div className="pointer-events-none absolute -left-1/4 -top-1/4 -z-10 h-[40%] w-[60%] rounded-full bg-gradient-to-br from-[#d5ffe9]/50 via-[#f4fff9]/30 to-transparent blur-3xl" />
          <div className="pointer-events-none absolute -right-1/4 -bottom-1/4 -z-10 h-[40%] w-[50%] rounded-full bg-gradient-to-tr from-[#00fdc2]/20 via-[#05ef62]/15 to-transparent blur-[100px]" />

          <div className="relative z-10 space-y-4 text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62] to-[#29cf9f] text-white animate-pulse">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="text-4xl font-bold text-neutral-900">Welcome to TrafficMENA</h1>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#29cf9f] to-[#00fdc2] text-white animate-pulse">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
            <p className="mx-auto max-w-2xl text-lg text-neutral-700">
              Glad to have you here. Explore upcoming events and dive into the knowledge library to
              sharpen your marketing edge across the MENA region.
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="flex flex-col rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62] to-[#29cf9f] text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <CardTitle className="text-neutral-900">Upcoming Events</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between space-y-4">
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
                    <div
                      key={event.id}
                      className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-4 text-left transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-lg hover:border-[#05ef62]/40"
                    >
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
                <a href="/meetups">Browse Events</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#29cf9f] to-[#00fdc2] text-white">
                  <Library className="h-5 w-5" />
                </div>
                <CardTitle className="text-neutral-900">Latest Learning Resources</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between space-y-4">
              <div className="space-y-3">
                {assetsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : assetsError ? (
                  <p className="text-sm text-destructive">
                    Unable to load library items right now.
                  </p>
                ) : assets.length > 0 ? (
                  assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-4 text-left transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-lg hover:border-[#29cf9f]/40"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2">
                          {asset.title}
                        </h3>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#f4fff9]/40 to-[#d5ffe9]/20 flex-shrink-0 ml-2">
                          <FileText className="h-4 w-4 text-[#29cf9f]" />
                        </div>
                      </div>
                      {asset.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
                          {asset.description}
                        </p>
                      ) : null}
                      <div className="mt-3 flex items-center gap-2">
                        <Badge className="rounded-full border border-[#29cf9f]/60 bg-[#29cf9f]/10 text-[#29cf9f] px-2 py-1 text-[10px] font-medium">
                          {asset.file_type}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-600">
                    Library uploads will appear here as soon as they&apos;re published.
                  </p>
                )}
              </div>
              <Button
                className="self-start rounded-xl bg-gradient-to-r from-[#29cf9f] to-[#00fdc2] px-4 py-2 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95"
                variant="default"
                asChild
              >
                <a href="/dashboard/library">View Library</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WelcomeDashboard;
