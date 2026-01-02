import { Calendar, CalendarPlus, ExternalLink, FolderOpen, Plus, RefreshCcw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeleteTrack, useTracks } from '@/features/tracks/hooks/useTracks';
import DataLoader from '@/shared/components/DataLoader';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';
import { useEvents } from '../hooks/useEvents';

// API caps pageSize at 50 (see server/src/routes/api/events.ts); stay within limit.
const PAGE_SIZE = 50;

const AdminMeetups = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('events');
  const { canDeleteContent } = useRolePermissions();

  // Events data
  const { data, isLoading, error, refetch, isFetching } = useEvents(1, PAGE_SIZE);
  const upcoming = data?.items.filter((event) => new Date(event.date) > new Date()) ?? [];
  const past = data?.items.filter((event) => new Date(event.date) <= new Date()) ?? [];

  // Tracks data
  const {
    data: tracksData,
    isLoading: tracksLoading,
    refetch: refetchTracks,
    isFetching: tracksFetching,
  } = useTracks(1, PAGE_SIZE);
  const deleteMutation = useDeleteTrack();

  const handleDeleteTrack = (trackId: string, trackTitle: string) => {
    if (!canDeleteContent) {
      toast({
        title: 'Insufficient permissions',
        description: 'Only owners and admins can delete tracks.',
        variant: 'destructive',
      });
      return;
    }
    const confirmed = window.confirm(
      `Delete "${trackTitle}"? The events will remain but will no longer be part of this track.`,
    );
    if (!confirmed) return;
    deleteMutation.mutate(trackId);
  };

  return (
    <AppLayout variant="admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-primary">Events & Tracks</h1>
              <p className="text-sm text-muted-foreground">
                Manage events and organize them into bookable tracks.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeTab === 'events' ? (
              <Button
                onClick={() => navigate('/admin/meetups/new')}
                className="flex items-center gap-2"
              >
                <CalendarPlus className="h-4 w-4" />
                Create event
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/admin/library/tracks/new')}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create track
              </Button>
            )}
            <Button
              variant="outline"
              disabled={activeTab === 'events' ? isFetching : tracksFetching}
              onClick={async () => {
                if (activeTab === 'events') {
                  const result = await refetch();
                  if (result.error) {
                    toast({
                      title: 'Refresh failed',
                      description: 'We could not refresh events right now.',
                      variant: 'destructive',
                    });
                  }
                } else {
                  await refetchTracks();
                }
              }}
              className="flex items-center gap-2"
            >
              <RefreshCcw
                className={
                  (activeTab === 'events' ? isFetching : tracksFetching)
                    ? 'h-4 w-4 animate-spin'
                    : 'h-4 w-4'
                }
              />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="tracks" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Tracks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-6">
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
                        <CardTitle className="text-sm text-muted-foreground">
                          Total Events
                        </CardTitle>
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
                          No events found. Use the "Create event" button above to publish your first
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
                                <h3 className="text-lg font-semibold text-primary">
                                  {event.title}
                                </h3>
                                <Badge
                                  variant={
                                    new Date(event.date) > new Date() ? 'default' : 'secondary'
                                  }
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
          </TabsContent>

          <TabsContent value="tracks" className="mt-6">
            <DataLoader loading={tracksLoading} error={null} loadingText="Loading tracks...">
              {tracksData ? (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">
                          Total Tracks
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-semibold">{tracksData.total}</p>
                        <p className="text-xs text-muted-foreground">Bookable event bundles</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">Published</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-semibold">
                          {tracksData.items.filter((t) => t.is_published).length}
                        </p>
                        <p className="text-xs text-muted-foreground">Visible to members</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">Drafts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-semibold">
                          {tracksData.items.filter((t) => !t.is_published).length}
                        </p>
                        <p className="text-xs text-muted-foreground">Not yet published</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Tracks</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {tracksData.items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 text-center">
                          <FolderOpen className="mb-3 h-10 w-10 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            No tracks yet. Create your first track to bundle events for booking.
                          </p>
                          <Button
                            className="mt-4"
                            onClick={() => navigate('/admin/library/tracks/new')}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Track
                          </Button>
                        </div>
                      ) : (
                        tracksData.items.map((track) => (
                          <div
                            key={track.id}
                            className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-primary">
                                  {track.title}
                                </h3>
                                <Badge variant={track.is_published ? 'default' : 'secondary'}>
                                  {track.is_published ? 'Published' : 'Draft'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {track.event_count} {track.event_count === 1 ? 'event' : 'events'}
                                {track.max_track_bookings
                                  ? ` · ${track.max_track_bookings} spots`
                                  : ''}
                              </p>
                              {track.track_booking_start && (
                                <p className="text-xs text-muted-foreground">
                                  Booking opens:{' '}
                                  {new Date(track.track_booking_start).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 self-start sm:self-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/admin/tracks/${track.id}`)}
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Details
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => navigate(`/admin/library/tracks/${track.id}`)}
                              >
                                Edit
                              </Button>
                              {canDeleteContent && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteTrack(track.id, track.title)}
                                  disabled={deleteMutation.isPending}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
                  No track data available.
                </div>
              )}
            </DataLoader>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AdminMeetups;
