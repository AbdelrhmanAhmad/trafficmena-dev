import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, Search, UserPlus } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useId, useState } from 'react';
import { ApiError } from '@/app/api/client';
import { fetchUsersAdmin } from '@/app/api/users';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useCreateManualTrackEnrollment } from '../hooks/useTrackEnrollmentManagement';
import {
  formatManualEnrollmentAmountEgp,
  parseManualEnrollmentAmountEgp,
} from '../utils/manualEnrollmentAmount';

type TrackManualEnrollmentManagerProps = {
  trackId: string;
  trackTitle: string;
  defaultAmountPaidCents: number | null;
};

export function TrackManualEnrollmentManager({
  trackId,
  trackTitle,
  defaultAmountPaidCents,
}: TrackManualEnrollmentManagerProps) {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reason, setReason] = useState('Manual wallet transfer confirmed by ops');
  const [reference, setReference] = useState('');
  const [amountInput, setAmountInput] = useState(
    formatManualEnrollmentAmountEgp(defaultAmountPaidCents),
  );
  const memberSearchId = useId();
  const reasonId = useId();
  const referenceId = useId();
  const amountId = useId();
  const enrollmentMutation = useCreateManualTrackEnrollment(trackId);

  const usersQuery = useQuery({
    queryKey: ['track-manual-enrollment-users', committedSearch],
    queryFn: () =>
      fetchUsersAdmin({
        page: 1,
        pageSize: 8,
        search: committedSearch,
        fields: 'basic',
      }),
    enabled: committedSearch.trim().length > 0,
    staleTime: 30 * 1000,
  });

  const searchResults = usersQuery.data?.items ?? [];
  const selectedUser = searchResults.find((item) => item.id === selectedUserId) ?? null;

  const commitSearch = () => {
    const trimmed = searchInput.trim();
    if (trimmed === committedSearch) return;
    setCommittedSearch(trimmed);
    setSelectedUserId(null);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitSearch();
    }
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Select a member',
        description: 'Choose the account that should receive this track enrollment.',
        variant: 'destructive',
      });
      return;
    }

    const trimmedReason = reason.trim();
    const trimmedReference = reference.trim();
    if (trimmedReason.length < 3 || trimmedReference.length < 3) {
      toast({
        title: 'Reason and reference are required',
        description: 'Both fields must be at least 3 characters.',
        variant: 'destructive',
      });
      return;
    }

    const normalizedAmount = amountInput.trim();
    const amountPaidCents =
      normalizedAmount.length > 0 ? parseManualEnrollmentAmountEgp(normalizedAmount) : null;
    if (normalizedAmount.length > 0 && amountPaidCents === null) {
      toast({
        title: 'Invalid amount',
        description: 'Use a valid EGP amount like 800, 100.50, or 1,250.50.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await enrollmentMutation.mutateAsync({
        userId: selectedUserId,
        reason: trimmedReason,
        reference: trimmedReference,
        amountPaidCents,
      });

      toast({
        title: 'Enrollment created',
        description: `${result.trackTitle} is now active for ${selectedUser?.email ?? 'the selected member'}.`,
      });

      setSelectedUserId(null);
      setReference('');
      setCommittedSearch('');
      setSearchInput('');
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Unable to create the manual enrollment.';

      toast({
        title: 'Enrollment failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          <CardTitle className="text-lg font-semibold">Manual Enrollment</CardTitle>
        </div>
        <CardDescription>
          Add a platform member to {trackTitle} when payment was collected outside the gateway.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={memberSearchId}>Search members</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={memberSearchId}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by email, name, or phone"
                className="pl-9"
              />
            </div>
            <Button type="button" variant="outline" onClick={commitSearch}>
              Search
            </Button>
          </div>
        </div>

        {committedSearch ? (
          <div className="space-y-2 rounded-md border p-3">
            {usersQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading members...
              </div>
            ) : usersQuery.isError ? (
              <p className="text-sm text-destructive">
                {usersQuery.error instanceof Error
                  ? usersQuery.error.message
                  : 'Unable to load matching members.'}
              </p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching members found.</p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((user) => {
                  const isSelected = user.id === selectedUserId;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.name}</p>
                        <p className="truncate text-muted-foreground">{user.email}</p>
                      </div>
                      {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {selectedUser ? (
          <div className="rounded-md border border-dashed p-3 text-sm">
            <p className="font-medium">{selectedUser.name}</p>
            <p className="text-muted-foreground">{selectedUser.email}</p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={reasonId}>Grant reason</Label>
            <Input
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why this member is being enrolled manually"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={referenceId}>Reference</Label>
            <Input
              id={referenceId}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="instapay-2026-04-13-abc123"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={amountId}>Amount paid (EGP)</Label>
          <Input
            id={amountId}
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            inputMode="decimal"
            placeholder="800 or 100 EGP"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use the current track price.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={enrollmentMutation.isPending}
          className="w-full md:w-auto"
        >
          {enrollmentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Enroll Member
        </Button>
      </CardContent>
    </Card>
  );
}
