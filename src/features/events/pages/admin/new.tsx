import { CalendarPlus, FolderOpen } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAddEventsToTrack, useTrack } from '@/features/tracks/hooks/useTracks';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { AdminEventForm } from '../../components/AdminEventForm';
import { useCreateEvent } from '../../hooks/useEvents';

const AdminMeetupsNew = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const trackId = searchParams.get('trackId');

  const createEventMutation = useCreateEvent();
  const addToTrackMutation = useAddEventsToTrack();

  // Fetch track info if creating event for a track
  const { data: track } = useTrack(trackId || '');

  const isSubmitting = createEventMutation.isPending || addToTrackMutation.isPending;

  const handleSubmit = async (payload: Parameters<typeof createEventMutation.mutateAsync>[0]) => {
    // Step 1: Create the event
    const newEvent = await createEventMutation.mutateAsync(payload);

    // Step 2: If trackId present, add event to track
    if (trackId && newEvent?.id) {
      try {
        await addToTrackMutation.mutateAsync({
          trackId,
          eventIds: [newEvent.id],
        });
        // Navigate back to track detail
        navigate(`/admin/library/tracks/${trackId}`);
      } catch {
        // Event created but track association failed
        toast({
          title: 'Event created',
          description:
            'Event was created but could not be added to the track. You can add it manually.',
          variant: 'destructive',
        });
        navigate(`/admin/events/${newEvent.id}`);
      }
    } else {
      // Navigate to event detail (existing behavior)
      navigate(`/admin/events/${newEvent.id}`);
    }
  };

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {/* Track context banner */}
          {track && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <FolderOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">
                  Creating event for track: {track.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  This event will be automatically added to the track after creation.
                </p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <CalendarPlus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-semibold">Add a new event</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Publish upcoming workshops, meetups, or masterminds directly from the dashboard.
                  </p>
                  {!trackId && (
                    <p className="text-xs text-muted-foreground">
                      Need a refresher? Follow the checklist in{' '}
                      <code>docs/admin-content-workflow.md</code>.
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AdminEventForm
                submitLabel={trackId ? 'Create & Add to Track' : 'Create event'}
                isSubmitting={isSubmitting}
                trackInfo={
                  track
                    ? { title: track.title, maxTrackBookings: track.max_track_bookings }
                    : undefined
                }
                onSubmit={async (payload) => {
                  try {
                    await handleSubmit(payload);
                  } catch {
                    // Toast surfaced via mutation hook
                  }
                }}
              />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </AdminProtectedRoute>
  );
};

export default AdminMeetupsNew;
