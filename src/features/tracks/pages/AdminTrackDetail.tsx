import { CalendarDays, ExternalLink, GraduationCap, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import DataLoader from '@/shared/components/DataLoader';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { formatMeetupDate } from '@/shared/utils/dateUtils';
import { TrackAttendeesList } from '../components/TrackAttendeesList';
import { TrackManualEnrollmentManager } from '../components/TrackManualEnrollmentManager';
import { useTrack } from '../hooks/useTracks';

const AdminTrackDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: track, isLoading, error } = useTrack(id || '');

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not set';
    return formatMeetupDate(date.toISOString());
  };

  return (
    <AppLayout variant="admin">
      <DataLoader
        loading={isLoading}
        error={error ? 'Unable to load this track.' : null}
        loadingText="Loading track details..."
      >
        {track ? (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={track.is_published ? 'default' : 'secondary'}>
                      {track.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-semibold text-primary">
                    {track.title}
                  </CardTitle>
                  {track.description && (
                    <p className="mt-2 text-muted-foreground">{track.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!id) return;
                      window.open(`/tracks/${id}`, '_blank');
                      toast({ title: 'Opening public track page' });
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View public page
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => navigate(`/admin/library/tracks/${track.id}`)}
                  >
                    Edit track
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  <span>{track.event_count} events</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {track.bookings_count}
                    {track.max_track_bookings ? ` / ${track.max_track_bookings}` : ''} enrolled
                  </span>
                </div>
                {track.track_booking_start && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span>Booking opens: {formatDate(track.track_booking_start)}</span>
                  </div>
                )}
                {track.track_booking_end && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span>Booking closes: {formatDate(track.track_booking_end)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <TrackManualEnrollmentManager
              key={`${track.id}-manual-enrollment`}
              trackId={track.id}
              trackTitle={track.title}
              defaultAmountPaidCents={track.price_in_cents}
            />
            <TrackAttendeesList key={`${track.id}-attendees`} trackId={track.id} />
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
            This track could not be found.
          </div>
        )}
      </DataLoader>
    </AppLayout>
  );
};

export default AdminTrackDetail;
