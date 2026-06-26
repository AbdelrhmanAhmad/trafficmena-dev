import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Search, Users } from 'lucide-react';
import { useId, useState } from 'react';
import { ApiError } from '@/app/api/client';
import type { TicketType } from '@/app/api/payments';
import { TicketTypeFilter } from '@/features/tracks/components/TicketTypeFilter';
import { ticketTypeLabel } from '@/features/tracks/ticketTypes';
import { formatAmountPaid } from '@/features/tracks/utils/manualEnrollmentAmount';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useSeriesAttendees } from '../hooks/useSeriesAttendees';
import { useRevokeSeriesAccess } from '../hooks/useSeriesGrants';

interface SeriesAttendeesListProps {
  seriesId: string;
}

// Mirrors the server's MAX_MERGE_ROWS cap (server/src/utils/seriesAttendees.ts); display only.
const MAX_MERGE_ROWS_DISPLAY = 2000;

function formatEnrollmentSource(source: 'paid' | 'free' | 'manual') {
  if (source === 'manual') return 'Manual';
  if (source === 'free') return 'Free';
  return 'Paid';
}

export const SeriesAttendeesList = ({ seriesId }: SeriesAttendeesListProps) => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [ticketTypeFilter, setTicketTypeFilter] = useState<TicketType | 'all'>('all');
  const revokeReasonId = useId();
  const [revokeDialog, setRevokeDialog] = useState<{
    userId: string;
    email: string;
    reason: string;
  } | null>(null);
  const { data, isLoading, isError, page, setPage, pageSize } = useSeriesAttendees(
    seriesId,
    20,
    search,
    ticketTypeFilter === 'all' ? undefined : ticketTypeFilter,
  );
  const isTruncated = Boolean(data?.truncated);
  const revokeMutation = useRevokeSeriesAccess(seriesId);

  const totalPages = data?.total ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const isRevokePending = Boolean(
    revokeDialog &&
      revokeMutation.isPending &&
      revokeMutation.variables?.userId === revokeDialog.userId,
  );

  const handlePrev = () => setPage((currentPage) => Math.max(1, currentPage - 1));
  const handleNext = () => setPage((currentPage) => Math.min(totalPages, currentPage + 1));

  const handleConfirmRevoke = async () => {
    if (!revokeDialog) return;
    const trimmedReason = revokeDialog.reason.trim();
    if (trimmedReason.length < 3) {
      toast({
        title: 'Reason required',
        description: 'Provide at least 3 characters for audit logs.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await revokeMutation.mutateAsync({
        userId: revokeDialog.userId,
        reason: trimmedReason,
      });
      toast({
        title: 'Access revoked',
        description: `${revokeDialog.email} no longer has this series grant.`,
      });
      setRevokeDialog(null);
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Unable to revoke the grant.';

      toast({
        title: 'Revoke failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

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
    <>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5" />
              Enrolled Users
              {data?.total ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({data.total})
                </span>
              ) : null}
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Track buyers and members with a manual grant are listed here. Subscribers and staff also
            have access and are not listed; non-premium series are visible to all members.
          </p>
          {isTruncated ? (
            <p className="text-sm text-amber-600">
              Showing the {MAX_MERGE_ROWS_DISPLAY} most recent enrollments; older records are not
              listed.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Quick search by name, email, phone, invoice ID, invoice number, or reference"
                className="pl-9"
              />
            </div>
            <TicketTypeFilter value={ticketTypeFilter} onChange={setTicketTypeFilter} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Loading enrolled users...
            </div>
          ) : !data?.items || data.items.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No users have enrolled in this series yet.
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
                    <TableHead>Ticket Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell>{attendee.phoneNumber || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(attendee.bookedAt), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell>{attendee.invoiceId ?? '-'}</TableCell>
                      <TableCell>{attendee.invoiceNumber ?? '-'}</TableCell>
                      <TableCell>
                        {ticketTypeLabel(attendee.ticketType, Boolean(attendee.grantId))}
                      </TableCell>
                      <TableCell>{formatEnrollmentSource(attendee.source)}</TableCell>
                      <TableCell>{attendee.reference ?? '-'}</TableCell>
                      <TableCell>{formatAmountPaid(attendee.amountPaidCents)}</TableCell>
                      <TableCell className="text-right">
                        {attendee.grantId ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setRevokeDialog({
                                userId: attendee.userId,
                                email: attendee.email,
                                reason: `Series access revoked for ${attendee.email}`,
                              })
                            }
                          >
                            Revoke
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 ? (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handlePrev}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleNext}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(revokeDialog)}
        onOpenChange={(open) => (!open ? setRevokeDialog(null) : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Series Grant</DialogTitle>
            <DialogDescription>
              This removes the manual series access grant for {revokeDialog?.email}. It does not
              affect access derived from a track booking or subscription.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={revokeReasonId}>Revoke reason</Label>
            <Input
              id={revokeReasonId}
              value={revokeDialog?.reason ?? ''}
              onChange={(event) =>
                setRevokeDialog((current) =>
                  current ? { ...current, reason: event.target.value } : current,
                )
              }
              placeholder="Why this grant is being removed"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRevokeDialog(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmRevoke} disabled={isRevokePending}>
              {isRevokePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
