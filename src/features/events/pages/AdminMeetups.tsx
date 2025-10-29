import { Calendar, CalendarPlus, ExternalLink, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataLoader from '@/shared/components/DataLoader';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useEvents } from '../hooks/useEvents';

// API caps pageSize at 50 (see server/src/routes/api/events.ts); stay within limit.
const PAGE_SIZE = 50;

const AdminMeetups = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error, refetch, isFetching } = useEvents(1, PAGE_SIZE);

  const upcoming = data?.items.filter((event) => new Date(event.date) > new Date()) ?? [];
  const past = data?.items.filter((event) => new Date(event.date) <= new Date()) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-primary">Event Overview</h1>
              <p className="text-sm text-muted-foreground">
                Manage upcoming workshops and publish new meetups directly from the admin panel.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => navigate('/admin/meetups/new')}
              className="flex items-center gap-2"
            >
              <CalendarPlus className="h-4 w-4" />
              Create event
            </Button>
            <Button
              variant="outline"
              disabled={isFetching}
              onClick={async () => {
                const result = await refetch();
                if (result.error) {
                  toast({
                    title: 'Refresh failed',
                    description: 'We could not refresh events right now.',
                    variant: 'destructive',
                  });
                }
              }}
              className="flex items-center gap-2"
            >
              <RefreshCcw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Refresh
            </Button>
          </div>
        </div>

        <DataLoader
          loading={isLoading}
          error={error ? 'Unable to load events from the new API.' : null}
          loadingText="Loading events..."
        >
          {data ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">Total Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold">{data.total}</p>
                    <p className="text-xs text-muted-foreground">Pulled from /api/events</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">Upcoming</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold">{upcoming.length}</p>
                    <p className="text-xs text-muted-foreground">Auto-calculated by date</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">Past</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold">{past.length}</p>
                    <p className="text-xs text-muted-foreground">
                      Migrations keep existing data intact
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Events</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No events found. Use the “Create event” button above to publish your first
                      session.
                    </p>
                  ) : (
                    data.items.map((event) => (
                      <div
                        key={event.id}
                        className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-primary">{event.title}</h3>
                            <Badge
                              variant={new Date(event.date) > new Date() ? 'default' : 'secondary'}
                            >
                              {new Date(event.date) > new Date() ? 'Upcoming' : 'Past'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.date).toLocaleString()} ·{' '}
                            {event.location ?? 'Location TBC'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {event.attendee_count} registered
                            {event.max_attendees ? ` · capacity ${event.max_attendees}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/admin/meetups/edit/${event.id}`)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/events/${event.id}`)}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
              No event data available.
            </div>
          )}
        </DataLoader>
      </div>
    </AdminLayout>
  );
};

export default AdminMeetups;
