import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Upload } from 'lucide-react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useId, useRef, useState } from 'react';
import { ApiError } from '@/app/api/client';
import { fetchUsersAdmin } from '@/app/api/users';
import { useBulkSeriesGrants, useGrantSeriesAccess } from '@/features/series/hooks/useSeriesGrants';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/custom/use-toast';

type SeriesAccessManagerProps = {
  seriesId: string;
  seriesTitle: string;
};

// Add/bulk-grant controls only. Active grants are listed (and revoked) in the unified
// "Enrolled Users" table above, so there is a single place to manage access.
export default function SeriesAccessManager({ seriesId }: SeriesAccessManagerProps) {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [grantReason, setGrantReason] = useState('Legacy premium series access grant');
  const [csvErrors, setCsvErrors] = useState<
    Array<{ line: number; email: string; reason: string }>
  >([]);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const searchId = useId();
  const reasonId = useId();
  const hasSearch = committedSearch.length > 0;

  const grantMutation = useGrantSeriesAccess(seriesId);
  const bulkMutation = useBulkSeriesGrants(seriesId);
  const isAnyMutationPending = grantMutation.isPending || bulkMutation.isPending;

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    if (trimmed === committedSearch) return;
    setCommittedSearch(trimmed);
    setSelectedUserIds([]);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!isAnyMutationPending) handleSearch();
    }
  };

  const usersQuery = useQuery({
    queryKey: ['series-grant-users-search', committedSearch],
    queryFn: () =>
      fetchUsersAdmin({
        page: 1,
        pageSize: 20,
        search: committedSearch || undefined,
        fields: 'basic',
      }),
    staleTime: 30 * 1000,
    enabled: hasSearch,
  });

  const searchResults = usersQuery.data?.items ?? [];
  const grantUsersErrorMessage =
    usersQuery.error instanceof Error
      ? usersQuery.error.message
      : 'Unable to load member list right now. Please refresh.';

  const toggleUser = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  const handleGrant = async () => {
    if (selectedUserIds.length === 0) {
      toast({
        title: 'No users selected',
        description: 'Select at least one user first.',
        variant: 'destructive',
      });
      return;
    }

    const reason = grantReason.trim();
    if (reason.length < 3) {
      toast({
        title: 'Reason required',
        description: 'Grant reason must be at least 3 characters.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await grantMutation.mutateAsync({ userIds: selectedUserIds, reason });
      toast({
        title: 'Access updated',
        description: `${result.grantedCount} granted, ${result.alreadyGrantedCount} already active.`,
      });
      setSelectedUserIds([]);
    } catch (error) {
      toast({
        title: 'Grant failed',
        description: error instanceof Error ? error.message : 'Unable to grant access.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    setCsvErrors([]);

    try {
      const result = await bulkMutation.mutateAsync(file);
      toast({
        title: 'Bulk grants complete',
        description: `${result.grantedCount} new grants, ${result.alreadyGrantedCount} already active.`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Bulk upload failed.';
      const extra =
        error instanceof ApiError
          ? (error.extra?.errors as
              | Array<{ line: number; email: string; reason: string }>
              | undefined)
          : undefined;
      setCsvErrors(extra ?? []);
      toast({ title: 'Bulk upload failed', description: message, variant: 'destructive' });
    } finally {
      if (bulkInputRef.current) {
        bulkInputRef.current.value = '';
      }
    }
  };

  return (
    <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg text-neutral-900">Manage Premium Access</CardTitle>
        <CardDescription className="text-neutral-600">
          Grant this premium series to specific members, or upload a CSV with columns
          <code className="ml-1">email,series_id,reason</code>. Revoke grants from the Enrolled
          Users table above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
            <Label htmlFor={searchId}>Search members</Label>
            <div className="flex gap-2">
              <Input
                id={searchId}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Type email and press Enter"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleSearch}
                disabled={isAnyMutationPending || searchInput.trim().length === 0}
                className="shrink-0"
              >
                {usersQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Label htmlFor={reasonId}>Grant reason</Label>
            <Input
              id={reasonId}
              value={grantReason}
              onChange={(event) => setGrantReason(event.target.value)}
              placeholder="Why are you granting this access?"
            />

            <div className="max-h-56 space-y-2 overflow-auto rounded-lg border border-neutral-200 p-2">
              {usersQuery.isFetching ? (
                <p className="text-sm text-muted-foreground">Searching members…</p>
              ) : !hasSearch ? (
                <p className="text-sm text-muted-foreground">
                  Type an email and press Enter or click the search button.
                </p>
              ) : usersQuery.isError ? (
                <p className="text-sm text-destructive">{grantUsersErrorMessage}</p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No users found matching this search.
                </p>
              ) : (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 rounded-md p-2 hover:bg-neutral-50"
                  >
                    <Checkbox
                      id={`series-grant-user-${user.id}`}
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <Label
                      htmlFor={`series-grant-user-${user.id}`}
                      className="cursor-pointer text-sm font-medium text-neutral-800"
                    >
                      {user.email}
                    </Label>
                  </div>
                ))
              )}
            </div>

            <Button
              type="button"
              onClick={handleGrant}
              disabled={isAnyMutationPending || selectedUserIds.length === 0}
            >
              {grantMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Granting…
                </>
              ) : (
                `Grant Access (${selectedUserIds.length})`
              )}
            </Button>
          </div>

          <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Upload className="h-4 w-4" /> Bulk CSV upload
            </Label>
            <Input
              ref={bulkInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleBulkUpload}
              disabled={isAnyMutationPending}
            />
            {bulkMutation.isPending ? (
              <p className="text-sm text-muted-foreground">Processing CSV…</p>
            ) : null}

            {csvErrors.length > 0 ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <p className="font-semibold">Validation errors (no rows were applied)</p>
                <ul className="mt-2 space-y-1">
                  {csvErrors.slice(0, 8).map((error, index) => (
                    <li key={`${error.line}-${index}`}>
                      Line {error.line} ({error.email || 'missing email'}): {error.reason}
                    </li>
                  ))}
                </ul>
                {csvErrors.length > 8 ? (
                  <p className="mt-1">+ {csvErrors.length - 8} more</p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Header is optional. Rows are validated as all-or-nothing.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
