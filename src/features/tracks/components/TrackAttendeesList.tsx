import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
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
import { useTrackAttendees } from '../hooks/useTrackAttendees';

interface TrackAttendeesListProps {
  trackId: string;
}

export const TrackAttendeesList = ({ trackId }: TrackAttendeesListProps) => {
  const { data, isLoading, isError, page, setPage, pageSize } = useTrackAttendees(trackId, 20);

  const totalPages = data?.total ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enrolled Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">
            Unable to load enrolled users. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Enrolled Users
          {data?.total ? (
            <span className="text-muted-foreground ml-2 text-sm font-normal">({data.total})</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            Loading enrolled users...
          </div>
        ) : !data?.items || data.items.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
            No users have enrolled in this track yet.
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Enrolled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((attendee) => (
                  <TableRow key={attendee.userId}>
                    <TableCell className="font-medium">
                      {attendee.name ||
                        [attendee.firstName, attendee.lastName].filter(Boolean).join(' ') ||
                        'Unknown Member'}
                    </TableCell>
                    <TableCell>{attendee.email}</TableCell>
                    <TableCell>
                      {format(new Date(attendee.bookedAt), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

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
