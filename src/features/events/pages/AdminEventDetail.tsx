import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import DataLoader from '@/shared/components/DataLoader';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useEvent } from '../hooks/useEvents';

type SanitizedHtmlProps = {
  className?: string;
  html: string;
};

const SanitizedHtml = ({ className, html }: SanitizedHtmlProps) => (
  <div
    className={className}
    // biome-ignore lint/security/noDangerouslySetInnerHtml: content sanitized with DOMPurify above
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

const AdminEventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: event, isLoading, error } = useEvent(id);
  const sanitizedDescription = event?.description
    ? DOMPurify.sanitize(event.description)
    : 'This event does not have a description yet.';

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
                  <SanitizedHtml
                    className="mt-2 prose prose-sm max-w-none text-muted-foreground prose-headings:text-primary prose-strong:text-primary prose-a:text-primary-green"
                    html={sanitizedDescription}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!id) return;
                      window.open(`/meetups/${id}`, '_blank');
                      toast({ title: 'Opening public event page' });
                    }}
                  >
                    View public page
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => navigate(`/admin/meetups/edit/${event.id}`)}
                  >
                    Edit event
                  </Button>
                </div>
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
