import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { useEventAttendees } from '../hooks/useEventAttendees';

interface EventAttendeesListProps {
  eventId: string;
}

export const EventAttendeesList = ({ eventId }: EventAttendeesListProps) => {
  // Page size 20 as per plan
  const { data, isLoading, isError, page, setPage, pageSize } = useEventAttendees(eventId, 20);

  const totalPages = data?.total ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">
            Unable to load attendees. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          Attendees
          {data?.total ? (
            <span className="text-muted-foreground ml-2 text-sm font-normal">({data.total})</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            Loading attendees...
          </div>
        ) : !data?.items || data.items.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
            No attendees registered for this event yet.
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((attendee) => (
                  <TableRow key={attendee.user_id}>
                    <TableCell className="font-medium">
                      {attendee.name || 'Unknown Member'}
                    </TableCell>
                    <TableCell>{attendee.email}</TableCell>
                    <TableCell>{attendee.phone_number || '-'}</TableCell>
                    <TableCell>
                      {format(new Date(attendee.registered_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      {attendee.status === 'active' && (
                        <Badge variant="default" className="bg-green-600">
                          Active
                        </Badge>
                      )}
                      {attendee.status === 'cancelled' && (
                        <Badge variant="destructive">Cancelled</Badge>
                      )}
                      {attendee.status === 'refund_requested' && (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          Refund Pending
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handlePrev} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNext}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
