import { useQuery } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useId, useState } from 'react';
import { fetchUsersAdmin } from '@/app/api/users';
import { useManualMasterclassEnrollment, useMasterclassEnrollments } from '@/features/masterclasses/hooks/useMasterclasses';
import { Badge } from '@/shared/components/ui/badge';
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
import { Textarea } from '@/shared/components/ui/textarea';

type MasterclassManualEnrollmentProps = {
  masterclassId: string;
  masterclassTitle: string;
};

export function MasterclassManualEnrollment({
  masterclassId,
  masterclassTitle,
}: MasterclassManualEnrollmentProps) {
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const searchId = useId();
  const noteId = useId();

  const enrollmentsQuery = useMasterclassEnrollments(masterclassId);
  const enrollmentMutation = useManualMasterclassEnrollment(masterclassId);

  const usersQuery = useQuery({
    queryKey: ['masterclass-manual-enrollment-users', committedSearch],
    queryFn: () =>
      fetchUsersAdmin({
        page: 1,
        pageSize: 8,
        search: committedSearch,
        fields: 'basic',
      }),
    enabled: committedSearch.trim().length > 0,
    staleTime: 30_000,
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

  const handleEnroll = async () => {
    if (!selectedUserId) return;
    await enrollmentMutation.mutateAsync({ userId: selectedUserId, note: note.trim() || null });
    setSelectedUserId(null);
    setNote('');
  };

  const enrollments = enrollmentsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Manual enrollment
          </CardTitle>
          <CardDescription>
            Grant access to {masterclassTitle} without payment. Source is recorded as manual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={searchId}>Search member</Label>
            <div className="flex gap-2">
              <Input
                id={searchId}
                placeholder="Email or name"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              <Button type="button" variant="outline" onClick={commitSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {usersQuery.isFetching && (
            <p className="text-sm text-neutral-500">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Searching...
            </p>
          )}

          {committedSearch && !usersQuery.isFetching && searchResults.length === 0 && (
            <p className="text-sm text-neutral-500">No users found.</p>
          )}

          {searchResults.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {searchResults.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 ${
                      selectedUserId === user.id ? 'bg-emerald-50' : ''
                    }`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div>
                      <p className="font-medium">{user.name || user.email}</p>
                      <p className="text-sm text-neutral-500">{user.email}</p>
                    </div>
                    {selectedUserId === user.id && (
                      <Badge className="bg-[#29cf9f]">Selected</Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedUser && (
            <div className="space-y-2">
              <Label htmlFor={noteId}>Note (optional)</Label>
              <Textarea
                id={noteId}
                rows={2}
                placeholder="Reason for manual access"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}

          <Button
            type="button"
            disabled={!selectedUserId || enrollmentMutation.isPending}
            onClick={() => void handleEnroll()}
          >
            {enrollmentMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Enroll selected user
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Enrollments ({enrollments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollmentsQuery.isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-neutral-500">No enrollments yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {enrollments.map((row) => (
                <li key={row.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {row.firstName || row.lastName
                          ? `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim()
                          : row.name || row.email}
                      </p>
                      <p className="text-sm text-neutral-500">{row.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={row.source === 'paid' ? 'default' : 'secondary'}>
                        {row.source}
                      </Badge>
                      <span className="text-xs text-neutral-400">
                        {new Date(row.enrolledAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {row.enrollmentNote && (
                    <p className="mt-1 text-xs text-neutral-500">{row.enrollmentNote}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
