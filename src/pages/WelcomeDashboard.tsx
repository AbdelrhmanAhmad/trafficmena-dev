import { useQuery } from '@tanstack/react-query';
import { Calendar, Library, MapPin, Sparkles } from 'lucide-react';
import type React from 'react';
import { fetchEvents } from '@/app/api/events';
import { fetchLibraryAssets } from '@/app/api/library';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
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
        <section className="space-y-4 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-primary-green" />
            <h1 className="text-3xl font-bold text-primary">Welcome to TrafficMENA</h1>
            <Sparkles className="h-8 w-8 text-primary-green" />
          </div>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Glad to have you here. Explore upcoming events and dive into the knowledge library to
            sharpen your marketing edge across the MENA region.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
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
                    <div key={event.id} className="rounded-lg border border-muted p-3 text-left">
                      <h3 className="text-sm font-semibold text-primary">{event.title}</h3>
                      <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(event.date)}
                      </p>
                      {event.location ? (
                        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </p>
                      ) : null}
                      <p className="mt-2 inline-flex items-center rounded-full bg-muted px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {event.event_type}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No upcoming events yet. Check back soon or create your first meetup.
                  </p>
                )}
              </div>
              <Button className="self-start" variant="default" asChild>
                <a href="/meetups">Browse Events</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Library className="h-5 w-5" />
                Latest Learning Resources
              </CardTitle>
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
                    <div key={asset.id} className="rounded-lg border border-muted p-3 text-left">
                      <h3 className="text-sm font-semibold text-primary">{asset.title}</h3>
                      {asset.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {asset.description}
                        </p>
                      ) : null}
                      <p className="mt-2 inline-flex items-center rounded-full bg-muted px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {asset.file_type}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Library uploads will appear here as soon as they&apos;re published.
                  </p>
                )}
              </div>
              <Button className="self-start" variant="default" asChild>
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
