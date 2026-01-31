import { ArrowLeft, BookOpen, Calendar, FileText, Play, Video } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAssetsByEventIds } from '@/features/library/hooks/useLibrary';
import type { LibraryAsset } from '@/features/library/types';
import { TrackBookingButton } from '@/features/tracks/components/TrackBookingButton';
import { useTrack } from '@/features/tracks/hooks/useTracks';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AppLayout from '@/shared/components/layout/AppLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

// Event card with assets (assets passed from parent to avoid N+1)
const TrackEventCard: React.FC<{
  event: {
    id: string;
    title: string;
    description: string | null;
    date: string;
    asset_count: number;
  };
  assets: LibraryAsset[];
}> = ({ event, assets }) => {
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl border border-neutral-200 bg-white/95 shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(event.date).toLocaleDateString()}
            </CardDescription>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
            <BookOpen className="h-3 w-3" />
            {event.asset_count} assets
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {assets && assets.length > 0 ? (
          <div className="space-y-2">
            {assets.map((asset) => (
              <button
                type="button"
                key={asset.id}
                onClick={() => navigate(`/dashboard/library/${asset.id}`)}
                className="flex w-full items-center gap-3 rounded-lg border bg-neutral-50/50 p-3 text-left transition-colors hover:bg-neutral-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                  {asset.file_type === 'Video' ? (
                    <Video className="h-4 w-4 text-blue-600" />
                  ) : asset.file_type === 'Presentation' ? (
                    <Play className="h-4 w-4 text-purple-600" />
                  ) : (
                    <FileText className="h-4 w-4 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.title}</p>
                  <p className="text-xs text-muted-foreground">{asset.file_type}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No assets available for this event yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

const DashboardTrackDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: track, isLoading, isError } = useTrack(id || '');

  // Batch fetch assets for all events (single query instead of N queries)
  const eventIds = useMemo(() => track?.events.map((e) => e.id) ?? [], [track?.events]);
  const { data: assetsMap } = useAssetsByEventIds(eventIds);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout variant="member">
          <LoadingSpinner size="lg" text="Loading track..." />
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (isError || !track) {
    return (
      <ProtectedRoute>
        <AppLayout variant="member">
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">Track not found</p>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/library')}
              className="mt-4"
            >
              Back to Library
            </Button>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout variant="member">
        <div className="max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/library')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Button>

            <div className="relative overflow-hidden rounded-[28px] border border-neutral-200 bg-white/95 p-8 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
              {track.image_url && (
                <div className="absolute inset-0 opacity-10">
                  <img src={track.image_url} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/90 text-white mb-4">
                      Learning Track
                    </span>
                    <h1 className="text-3xl font-bold text-neutral-900">{track.title}</h1>
                    {track.description && (
                      <p className="mt-2 text-neutral-600 max-w-2xl">{track.description}</p>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-sm text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {track.event_count} {track.event_count === 1 ? 'session' : 'sessions'}
                      </span>
                      {track.track_booking_spots_remaining !== null && (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          {track.track_booking_spots_remaining <= 0 ? 'Sold Out' : 'Limited Spots'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Booking Button */}
                  {track.track_booking_start && (
                    <div className="ml-4 flex-shrink-0">
                      <TrackBookingButton
                        trackId={track.id}
                        isBooked={track.user_has_booked}
                        canBook={
                          !!(
                            track.track_booking_start &&
                            new Date() >= new Date(track.track_booking_start) &&
                            track.track_booking_end &&
                            new Date() <= new Date(track.track_booking_end)
                          )
                        }
                        spotsRemaining={track.track_booking_spots_remaining}
                        opensAt={
                          track.track_booking_start ? new Date(track.track_booking_start) : null
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sessions (Events) */}
          {track.events.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">Sessions</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  {track.event_count}
                </span>
              </div>
              <div className="space-y-4">
                {track.events.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                        {index + 1}
                      </div>
                      {index < track.events.length - 1 && (
                        <div className="w-px flex-1 bg-neutral-200 my-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <TrackEventCard event={event} assets={assetsMap?.get(event.id) ?? []} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state - only show when no sessions at all */}
          {track.events.length === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Sessions</h2>
              <Card className="rounded-2xl border border-neutral-200 bg-white/95 shadow-sm">
                <CardContent className="py-12 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-neutral-300" />
                  <p className="mt-4 text-muted-foreground">
                    No sessions have been added to this track yet.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default DashboardTrackDetail;
