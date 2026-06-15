import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Search, User } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
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
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, page, setPage, pageSize } = useEventAttendees(
    eventId,
    20,
    search,
  );

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
      <CardHeader className="space-y-4">
        <div className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Attendees
            {data?.total ? (
              <span className="text-muted-foreground ml-2 text-sm font-normal">({data.total})</span>
            ) : null}
          </CardTitle>
        </div>
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Quick search by name, email, phone, invoice ID, or invoice number"
            className="pl-9"
          />
        </div>
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
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Invoice Number</TableHead>
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
                    <TableCell>{attendee.invoice_id ?? '-'}</TableCell>
                    <TableCell>{attendee.invoice_number ?? '-'}</TableCell>
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
