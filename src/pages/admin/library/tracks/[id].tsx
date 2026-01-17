import { ArrowLeft, BookOpen, Calendar, Layers, Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TrackEventSelector from '@/features/tracks/components/TrackEventSelector';
import TrackForm from '@/features/tracks/components/TrackForm';
import {
  useAddEventsToTrack,
  useDeleteTrack,
  useRemoveEventFromTrack,
  useTrack,
  useUpdateTrack,
} from '@/features/tracks/hooks/useTracks';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';

function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showEventSelector, setShowEventSelector] = useState(false);
  const { canDeleteContent } = useRolePermissions();

  const { data: track, isLoading, isError } = useTrack(id || '');
  const updateMutation = useUpdateTrack();
  const deleteMutation = useDeleteTrack();
  const addEventsMutation = useAddEventsToTrack();
  const removeEventMutation = useRemoveEventFromTrack();

  if (isLoading) {
    return (
      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
        <AppLayout variant="admin">
          <LoadingSpinner size="lg" text="Loading track..." />
        </AppLayout>
      </AdminProtectedRoute>
    );
  }

  if (isError || !track) {
    return (
      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
        <AppLayout variant="admin">
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">Track not found</p>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/meetups?tab=tracks')}
              className="mt-4"
            >
              Back to Events & Tracks
            </Button>
          </div>
        </AppLayout>
      </AdminProtectedRoute>
    );
  }

  const handleUpdateTrack = async (values: {
    title: string;
    description?: string;
    imageUrl?: string;
    isPublished: boolean;
    maxTrackBookings?: number | null;
    trackBookingStart?: string | null;
    trackBookingEnd?: string | null;
    singleBookingStart?: string | null;
    singleBookingEnd?: string | null;
    priceEgp?: string;
  }) => {
    await updateMutation.mutateAsync({
      id: track.id,
      data: {
        title: values.title,
        description: values.description || null,
        imageUrl: values.imageUrl || null,
        isPublished: values.isPublished,
        maxTrackBookings: values.maxTrackBookings ?? null,
        trackBookingStart: values.trackBookingStart || null,
        trackBookingEnd: values.trackBookingEnd || null,
        singleBookingStart: values.singleBookingStart || null,
        singleBookingEnd: values.singleBookingEnd || null,
        priceInCents: values.priceEgp ? Math.round(Number(values.priceEgp) * 100) : null,
      },
    });
  };

  const handleDeleteTrack = () => {
    if (!canDeleteContent) {
      toast({
        title: 'Insufficient permissions',
        description: 'Only owners and admins can delete tracks.',
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm(
      'Delete this track? The events and their assets will remain in the library.',
    );
    if (!confirmed) return;

    deleteMutation.mutate(track.id, {
      onSuccess: () => navigate('/admin/meetups?tab=tracks'),
    });
  };

  const handleAddEvents = (eventIds: string[]) => {
    addEventsMutation.mutate(
      { trackId: track.id, eventIds },
      { onSuccess: () => setShowEventSelector(false) },
    );
  };

  const handleRemoveEvent = (eventId: string) => {
    const confirmed = window.confirm('Remove this event from the track?');
    if (!confirmed) return;
    removeEventMutation.mutate({ trackId: track.id, eventId });
  };

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin/meetups?tab=tracks')}
                className="rounded-xl"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                  <Layers className="h-5 w-5 text-[#05ef62]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">{track.title}</h1>
                  <p className="text-neutral-600">{track.event_count} events</p>
                </div>
              </div>
            </div>

            {canDeleteContent && (
              <Button
                variant="destructive"
                onClick={handleDeleteTrack}
                disabled={deleteMutation.isPending}
                className="rounded-xl"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete Track
              </Button>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Track Details */}
            <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg text-neutral-900">Track Details</CardTitle>
                <CardDescription className="text-neutral-600">
                  Update the track information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrackForm
                  track={track}
                  onSubmit={handleUpdateTrack}
                  onCancel={() => navigate('/admin/meetups?tab=tracks')}
                  isLoading={updateMutation.isPending}
                />
              </CardContent>
            </Card>

            {/* Events in Track */}
            <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-neutral-900">Events in Track</CardTitle>
                    <CardDescription className="text-neutral-600">
                      Events are displayed to members in the order shown below.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => navigate(`/admin/meetups/new?trackId=${track.id}`)}
                      className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010] font-medium shadow-sm hover:shadow-md hover:scale-105 transition-all"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Event
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowEventSelector(true)}
                      className="rounded-xl"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Existing
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {track.events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 text-center">
                    <Calendar className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No events in this track yet</p>
                    <div className="flex gap-2 mt-4">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => navigate(`/admin/meetups/new?trackId=${track.id}`)}
                      >
                        Create new event
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEventSelector(true)}
                      >
                        Add existing event
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {track.events.map((event, index) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 rounded-lg border bg-white p-3"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-neutral-100 text-xs font-medium text-neutral-600">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{event.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(event.date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {event.asset_count} assets
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveEvent(event.id)}
                          disabled={removeEventMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Event Selector Modal */}
        <TrackEventSelector
          open={showEventSelector}
          onOpenChange={setShowEventSelector}
          existingEventIds={track.events.map((e) => e.id)}
          onSelect={handleAddEvents}
          isLoading={addEventsMutation.isPending}
        />
      </AppLayout>
    </AdminProtectedRoute>
  );
}

export default TrackDetailPage;
