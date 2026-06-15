import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  approveCancellation,
  fetchCancellationRequests,
  rejectCancellation,
} from '@/app/api/events';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

type CancellationRequestsListProps = {
  eventId: string;
};

export function CancellationRequestsList({ eventId }: CancellationRequestsListProps) {
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['cancellation-requests', eventId, page, pageSize],
    queryFn: () => fetchCancellationRequests(eventId, { page, pageSize }),
    staleTime: 30000,
    placeholderData: keepPreviousData,
  });

  const approveMutation = useMutation({
    mutationFn: (registrationId: string) => approveCancellation(eventId, registrationId),
    onSuccess: () => {
      toast.success('Refund approved and registration cancelled.');
      queryClient.invalidateQueries({ queryKey: ['cancellation-requests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
    onError: () => {
      toast.error('Failed to approve the refund request.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ registrationId, reason }: { registrationId: string; reason?: string }) =>
      rejectCancellation(eventId, registrationId, reason),
    onSuccess: () => {
      toast.success('Refund request rejected. Registration restored.');
      queryClient.invalidateQueries({ queryKey: ['cancellation-requests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      setRejectDialogOpen(false);
      setSelectedRequestId(null);
      setRejectReason('');
    },
    onError: () => {
      toast.error('Failed to reject the refund request.');
    },
  });

  const handleApprove = (registrationId: string) => {
    approveMutation.mutate(registrationId);
  };

  const handleRejectClick = (registrationId: string) => {
    setSelectedRequestId(registrationId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedRequestId) return;
    const sanitizedReason = rejectReason
      ? DOMPurify.sanitize(rejectReason, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
      : undefined;
    rejectMutation.mutate({
      registrationId: selectedRequestId,
      reason: sanitizedReason || undefined,
    });
  };

  if (isLoading) {
    return null;
  }

  const requests = data?.items ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (requests.length === 0) {
    return null;
  }

  const formatPrice = (cents: number | null) => {
    if (!cents) return 'Free';
    return `EGP ${(cents / 100).toFixed(0)}`;
  };

  const getDisplayName = (request: (typeof requests)[0]) => {
    if (request.first_name || request.last_name) {
      return `${request.first_name ?? ''} ${request.last_name ?? ''}`.trim();
    }
    return request.name ?? request.email;
  };

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            Pending Refund Requests ({total || requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.registration_id}>
                  <TableCell className="font-medium">{getDisplayName(request)}</TableCell>
                  <TableCell>{request.email}</TableCell>
                  <TableCell>{formatPrice(request.price_paid_cents)}</TableCell>
                  <TableCell>
                    {request.refund_requested_at
                      ? format(new Date(request.refund_requested_at), 'MMM d, h:mm a')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(request.registration_id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectClick(request.registration_id)}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Refund Request</DialogTitle>
            <DialogDescription>
              The user's registration will be restored to active status. Optionally provide a reason
              for the rejection.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
