import { format } from 'date-fns';
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import { useParams } from 'react-router-dom';
import DataLoader from '@/shared/components/DataLoader';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useEvent } from '../hooks/useEvents';

const AdminEventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: event, isLoading, error } = useEvent(id);

  return (
    <AdminLayout>
      <DataLoader
        loading={isLoading}
        error={error ? 'Unable to load this event.' : null}
        loadingText="Loading event details..."
      >
        {event ? (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <Badge variant="secondary" className="mb-3">
                    {event.event_type}
                  </Badge>
                  <CardTitle className="text-2xl font-semibold text-primary">
                    {event.title}
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {event.description ?? 'This event does not have a description yet.'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!id) return;
                    window.open(`/meetups/${id}`, '_blank');
                    toast({ title: 'Opening public event page' });
                  }}
                >
                  View Public Page
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>
                    {(() => {
                      try {
                        return format(new Date(event.date), 'MMMM d, yyyy');
                      } catch {
                        return event.date;
                      }
                    })()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {(() => {
                      try {
                        return format(new Date(event.date), 'h:mm a');
                      } catch {
                        return 'Time TBD';
                      }
                    })()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{event.location ?? 'Location TBC'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {event.attendee_count}
                    {event.max_attendees ? ` / ${event.max_attendees}` : ''} attendees
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendee Insights (Coming Soon)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Detailed attendee exports and analytics will return once the new Hono admin APIs
                  are wired up. During the MVP we track registrations directly inside the event
                  detail endpoint.
                </p>
                <p>
                  Need attendee information today? Contact the engineering team and we can run a
                  manual query for you while the automation is finishing up.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
            This event could not be found. It may have been archived during the migration.
          </div>
        )}
      </DataLoader>
    </AdminLayout>
  );
};

export default AdminEventDetail;
