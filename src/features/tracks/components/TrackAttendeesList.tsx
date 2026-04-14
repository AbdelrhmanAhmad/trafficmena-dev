import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Search, Users } from 'lucide-react';
import { useId, useState } from 'react';
import { ApiError } from '@/app/api/client';
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
import { useTrackAttendees } from '../hooks/useTrackAttendees';
import { useRevokeTrackEnrollment } from '../hooks/useTrackEnrollmentManagement';

interface TrackAttendeesListProps {
  trackId: string;
}

function formatEnrollmentSource(source: 'paid' | 'free' | 'manual') {
  if (source === 'manual') return 'Manual';
  if (source === 'free') return 'Free';
  return 'Paid';
}

export const TrackAttendeesList = ({ trackId }: TrackAttendeesListProps) => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const revokeReasonId = useId();
  const [revokeDialog, setRevokeDialog] = useState<{
    userId: string;
    email: string;
    reason: string;
  } | null>(null);
  const { data, isLoading, isError, page, setPage, pageSize } = useTrackAttendees(
    trackId,
    20,
    search,
  );
  const revokeMutation = useRevokeTrackEnrollment(trackId);

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
        title: 'Enrollment revoked',
        description: `${revokeDialog.email} no longer has active access to this track.`,
      });
      setRevokeDialog(null);
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Unable to revoke the enrollment.';

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
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Quick search by name, email, phone, invoice ID, invoice number, or reference"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Loading enrolled users...
            </div>
          ) : !data?.items || data.items.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No users have enrolled in this track yet.
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
                    <TableHead>Source</TableHead>
                    <TableHead>Reference</TableHead>
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
                      <TableCell>{formatEnrollmentSource(attendee.source)}</TableCell>
                      <TableCell>{attendee.reference ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setRevokeDialog({
                              userId: attendee.userId,
                              email: attendee.email,
                              reason: `Access revoked for ${attendee.email}`,
                            })
                          }
                        >
                          Revoke
                        </Button>
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
            <DialogTitle>Revoke Track Enrollment</DialogTitle>
            <DialogDescription>
              This removes the track access and any event access that was created from this track
              enrollment.
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
              placeholder="Why this enrollment is being removed"
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
