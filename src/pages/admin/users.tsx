import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Gift,
  Loader2,
  RotateCcw,
  Search,
  Shield,
  Upload,
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ApiError } from '@/app/api/client';
import type { AdminUserRecord, AdminUsersSubscriptionFilter, UserRoleValue } from '@/app/api/users';
import { deleteUser, fetchUsersAdmin, updateUserRole } from '@/app/api/users';
import { useCurrentUser } from '@/app/hooks/useCurrentUser';
import {
  useBulkSubscriptionGrants,
  useCreateSubscriptionGrant,
  useRevokeSubscriptionGrant,
} from '@/app/hooks/useSubscriptions';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200] as const;

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  expert: 'Expert',
  user: 'User',
};

const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  expert: 'bg-amber-100 text-amber-800',
  user: 'bg-green-100 text-green-800',
};

const AdminUsersPage = () => {
  const { toast } = useToast();
  const { data: currentUser } = useCurrentUser();
  const { isOwner, role: currentRole } = useRolePermissions();
  const queryClient = useQueryClient();
  const isManagerRole = currentRole === 'manager';

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<
    'all' | 'owner' | 'admin' | 'manager' | 'expert' | 'user'
  >('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<AdminUsersSubscriptionFilter>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ user: AdminUserRecord } | null>(null);
  const [subscriptionDialog, setSubscriptionDialog] = useState<{
    user: AdminUserRecord;
    mode: 'grant' | 'revoke';
  } | null>(null);
  const [subscriptionSource, setSubscriptionSource] = useState<'legacy' | 'gift'>('legacy');
  const [subscriptionReason, setSubscriptionReason] = useState('Legacy yearly subscription grant');
  const [bulkSubscriptionErrors, setBulkSubscriptionErrors] = useState<
    Array<{ line: number; email: string; source: string; reason: string }>
  >([]);
  const [pendingRoleUserIds, setPendingRoleUserIds] = useState<Set<string>>(new Set());
  const bulkSubscriptionInputRef = useRef<HTMLInputElement | null>(null);
  const lastUsersErrorAtRef = useRef(0);
  const subscriptionSourceId = useId();
  const subscriptionReasonId = useId();
  const revokeReasonId = useId();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1); // Reset when debounce settles, not on every keystroke
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRoleValue }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      toast({ title: 'Role updated', description: 'User permissions have been refreshed.' });
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unable to update role.';
      toast({ title: 'Role update failed', description: message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      toast({ title: 'User removed', description: 'The account has been deleted.' });
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unable to delete user.';
      toast({ title: 'Delete failed', description: message, variant: 'destructive' });
    },
  });

  const createSubscriptionGrantMutation = useCreateSubscriptionGrant();
  const revokeSubscriptionGrantMutation = useRevokeSubscriptionGrant();
  const bulkSubscriptionGrantMutation = useBulkSubscriptionGrants();
  const usersQuery = useQuery({
    queryKey: ['admin-users', page, pageSize, debouncedSearch, roleFilter, subscriptionFilter],
    queryFn: () =>
      fetchUsersAdmin({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
        subscription: subscriptionFilter,
      }),
    placeholderData: keepPreviousData,
    enabled: searchInput.trim() === debouncedSearch,
  });

  useEffect(() => {
    if (!usersQuery.isError) return;
    if (usersQuery.errorUpdatedAt <= lastUsersErrorAtRef.current) return;
    lastUsersErrorAtRef.current = usersQuery.errorUpdatedAt;
    toast({
      title: 'Unable to load users',
      description: 'Please refresh the page or try again later.',
      variant: 'destructive',
    });
  }, [toast, usersQuery.errorUpdatedAt, usersQuery.isError]);

  const isDebouncing = searchInput.trim() !== debouncedSearch;
  const { data, isLoading, isError } = usersQuery;
  const users = data?.items ?? [];

  const hasOwner = useMemo(
    () => users.some((user) => (user.role ?? 'user').toLowerCase() === 'owner'),
    [users],
  );

  const bootstrapPromote = !hasOwner && currentRole === 'admin';

  const totalPages = data?.pagination.total
    ? Math.max(1, Math.ceil(data.pagination.total / pageSize))
    : 1;

  // Clamp page when total shrinks below current page (e.g., user deletion)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handlePrev = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleSubmitSubscriptionAction = async () => {
    if (!subscriptionDialog) return;

    const targetUserId = subscriptionDialog.user.id;
    const targetUserEmail = subscriptionDialog.user.email;
    const mode = subscriptionDialog.mode;
    const reason = subscriptionReason.trim();
    if (reason.length < 3) {
      toast({
        title: 'Reason required',
        description: 'Please provide at least 3 characters.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (mode === 'grant') {
        await createSubscriptionGrantMutation.mutateAsync({
          userId: targetUserId,
          source: subscriptionSource,
          reason,
        });
        toast({
          title: 'Subscription granted',
          description: `${targetUserEmail} received a yearly ${subscriptionSource} subscription.`,
        });
      } else {
        await revokeSubscriptionGrantMutation.mutateAsync({
          userId: targetUserId,
          reason,
        });
        toast({
          title: 'Subscription revoked',
          description: `Active legacy/gift subscription revoked for ${targetUserEmail}.`,
        });
      }

      setSubscriptionDialog((current) =>
        current?.user.id === targetUserId && current.mode === mode ? null : current,
      );
      setSubscriptionReason('Legacy yearly subscription grant');
      setSubscriptionSource('legacy');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update subscription.';
      toast({
        title: 'Subscription update failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleBulkSubscriptionUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setBulkSubscriptionErrors([]);

    try {
      const result = await bulkSubscriptionGrantMutation.mutateAsync(file);
      toast({
        title: 'Bulk subscriptions complete',
        description: `${result.grantedCount} yearly subscriptions granted.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bulk subscription upload failed.';
      const extra =
        error instanceof ApiError
          ? (error.extra?.errors as
              | Array<{ line: number; email: string; source: string; reason: string }>
              | undefined)
          : undefined;
      setBulkSubscriptionErrors(extra ?? []);
      toast({ title: 'Bulk upload failed', description: message, variant: 'destructive' });
    } finally {
      if (bulkSubscriptionInputRef.current) {
        bulkSubscriptionInputRef.current.value = '';
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog) return;

    const targetUserId = deleteDialog.user.id;
    try {
      await deleteMutation.mutateAsync(targetUserId);
      setDeleteDialog((current) => (current?.user.id === targetUserId ? null : current));
    } catch {
      // Mutation onError already reports a toast.
    }
  };

  const handleChangeRole = async (userId: string, role: UserRoleValue) => {
    setPendingRoleUserIds((current) => {
      const next = new Set(current);
      next.add(userId);
      return next;
    });

    try {
      await roleMutation.mutateAsync({ userId, role });
    } catch {
      // Role mutation error toast is handled in onError.
    } finally {
      setPendingRoleUserIds((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
    }
  };

  const isSubscriptionMutationPending =
    createSubscriptionGrantMutation.isPending ||
    revokeSubscriptionGrantMutation.isPending ||
    bulkSubscriptionGrantMutation.isPending;

  const pendingSubscriptionUserIds = useMemo(() => {
    const pending = new Set<string>();
    const createUserId = createSubscriptionGrantMutation.variables?.userId;
    const revokeUserId = revokeSubscriptionGrantMutation.variables?.userId;

    if (createSubscriptionGrantMutation.isPending && createUserId) {
      pending.add(createUserId);
    }
    if (revokeSubscriptionGrantMutation.isPending && revokeUserId) {
      pending.add(revokeUserId);
    }

    return pending;
  }, [
    createSubscriptionGrantMutation.isPending,
    createSubscriptionGrantMutation.variables?.userId,
    revokeSubscriptionGrantMutation.isPending,
    revokeSubscriptionGrantMutation.variables?.userId,
  ]);

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-2xl font-semibold text-neutral-900">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                  <Shield className="h-5 w-5 text-[#05ef62]" />
                </div>
                Member Directory
              </CardTitle>
              <p className="text-sm text-neutral-600 mt-2 ml-[52px]">
                View and filter community members. Owners can adjust roles. If you&apos;re the first
                admin here, promote yourself to owner to unlock full controls.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                  }}
                  placeholder="Search by name or email"
                  className="pl-9 rounded-xl border-neutral-200 bg-white/70 backdrop-blur"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(value: typeof roleFilter) => {
                  setRoleFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="sm:w-40 rounded-xl border-neutral-200 bg-white/70 backdrop-blur">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="owner">Owners</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="manager">Managers</SelectItem>
                  <SelectItem value="expert">Experts</SelectItem>
                  <SelectItem value="user">Members</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={subscriptionFilter}
                onValueChange={(value: typeof subscriptionFilter) => {
                  setSubscriptionFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="sm:w-48 rounded-xl border-neutral-200 bg-white/70 backdrop-blur">
                  <SelectValue placeholder="Subscription" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subscriptions</SelectItem>
                  <SelectItem value="subscribed">Subscribed</SelectItem>
                  <SelectItem value="not_subscribed">Not subscribed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {!isManagerRole ? (
              <div className="mb-6 rounded-xl border border-neutral-200 bg-white/70 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                  <Upload className="h-4 w-4 text-[#05ef62]" />
                  Bulk legacy/gift yearly subscriptions
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  CSV columns: <code>email</code>, <code>source</code> (<code>legacy</code> or
                  <code>gift</code>), <code>reason</code>. Header row optional. Upload is
                  all-or-nothing.
                </p>
                <Input
                  ref={bulkSubscriptionInputRef}
                  className="mt-3"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleBulkSubscriptionUpload}
                  disabled={isSubscriptionMutationPending}
                />
                {bulkSubscriptionGrantMutation.isPending ? (
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing CSV…
                  </p>
                ) : null}
                {bulkSubscriptionErrors.length > 0 ? (
                  <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    <p className="font-medium">Validation errors (no rows were applied)</p>
                    <ul className="mt-1 space-y-1">
                      {bulkSubscriptionErrors.slice(0, 6).map((error, index) => (
                        <li key={`${error.line}-${index}`}>
                          Line {error.line} ({error.email || 'missing email'}): {error.reason}
                        </li>
                      ))}
                    </ul>
                    {bulkSubscriptionErrors.length > 6 ? (
                      <p className="mt-1">+ {bulkSubscriptionErrors.length - 6} more</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex min-h-[200px] items-center justify-center text-neutral-500">
                Loading users…
              </div>
            ) : isError ? (
              <div className="flex min-h-[200px] items-center justify-center text-red-600">
                Unable to fetch users.
              </div>
            ) : users.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center text-neutral-500">
                No users match your filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <AdminUserRow
                      key={user.id}
                      user={user}
                      currentUserId={currentUser?.user?.id ?? null}
                      actorRole={currentRole}
                      isOwner={isOwner}
                      isManagerRole={isManagerRole}
                      bootstrapPromote={bootstrapPromote}
                      onChangeRole={handleChangeRole}
                      pendingRoleUserIds={pendingRoleUserIds}
                      onRequestDelete={(payload) => setDeleteDialog(payload)}
                      pendingDeleteUserId={
                        deleteMutation.isPending ? (deleteMutation.variables ?? null) : null
                      }
                      onManageSubscription={(payload) => {
                        if (subscriptionDialog) return;
                        setSubscriptionDialog(payload);
                        setSubscriptionReason(
                          payload.mode === 'grant'
                            ? 'Legacy yearly subscription grant'
                            : 'Legacy or gift subscription revoked',
                        );
                      }}
                      pendingSubscriptionUserIds={pendingSubscriptionUserIds}
                    />
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                Showing {users.length} of {data?.pagination.total ?? 0} members
              </p>
              <div className="flex items-center gap-3">
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-20 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrev}
                  disabled={page === 1 || isDebouncing}
                  className="rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-neutral-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  disabled={page >= totalPages || isDebouncing}
                  className="rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog
          open={Boolean(deleteDialog)}
          onOpenChange={(open) => {
            if (!open && !deleteMutation.isPending) {
              setDeleteDialog(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this member?</DialogTitle>
              <DialogDescription>
                Removing {deleteDialog?.user.email} will permanently erase their profile, event
                registrations, and library history. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialog(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Removing…' : 'Delete member'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(subscriptionDialog)}
          onOpenChange={(open) => {
            if (!open && !isSubscriptionMutationPending) {
              setSubscriptionDialog(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {subscriptionDialog?.mode === 'grant'
                  ? 'Grant yearly subscription'
                  : 'Revoke legacy/gift subscription'}
              </DialogTitle>
              <DialogDescription>
                {subscriptionDialog?.mode === 'grant'
                  ? `Grant a non-sales yearly subscription to ${subscriptionDialog?.user.email}.`
                  : `Revoke active legacy/gift access for ${subscriptionDialog?.user.email}. Paid subscriptions cannot be revoked from this action.`}
              </DialogDescription>
            </DialogHeader>

            {subscriptionDialog?.mode === 'grant' ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={subscriptionSourceId}>Source</Label>
                  <Select
                    value={subscriptionSource}
                    onValueChange={(value: 'legacy' | 'gift') => setSubscriptionSource(value)}
                  >
                    <SelectTrigger id={subscriptionSourceId}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="legacy">Legacy</SelectItem>
                      <SelectItem value="gift">Gift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={subscriptionReasonId}>Reason</Label>
                  <Input
                    id={subscriptionReasonId}
                    value={subscriptionReason}
                    onChange={(event) => setSubscriptionReason(event.target.value)}
                    placeholder="Required audit reason"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor={revokeReasonId}>Revoke reason</Label>
                <Input
                  id={revokeReasonId}
                  value={subscriptionReason}
                  onChange={(event) => setSubscriptionReason(event.target.value)}
                  placeholder="Required audit reason"
                />
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSubscriptionDialog(null)}
                disabled={isSubscriptionMutationPending}
              >
                Cancel
              </Button>
              <Button
                variant={subscriptionDialog?.mode === 'grant' ? 'default' : 'destructive'}
                onClick={handleSubmitSubscriptionAction}
                disabled={isSubscriptionMutationPending}
              >
                {isSubscriptionMutationPending
                  ? 'Saving…'
                  : subscriptionDialog?.mode === 'grant'
                    ? 'Grant yearly subscription'
                    : 'Revoke subscription'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppLayout>
    </AdminProtectedRoute>
  );
};

const AdminUserRow = ({
  user,
  isOwner,
  isManagerRole,
  bootstrapPromote,
  actorRole,
  currentUserId,
  onChangeRole,
  pendingRoleUserIds,
  pendingDeleteUserId,
  onRequestDelete,
  onManageSubscription,
  pendingSubscriptionUserIds,
}: {
  user: AdminUserRecord;
  isOwner: boolean;
  isManagerRole: boolean;
  bootstrapPromote: boolean;
  actorRole: UserRoleValue | null;
  currentUserId: string | null;
  onChangeRole: (userId: string, role: UserRoleValue) => Promise<void>;
  pendingRoleUserIds: Set<string>;
  pendingDeleteUserId: string | null;
  onRequestDelete: (payload: { user: AdminUserRecord }) => void;
  onManageSubscription: (payload: { user: AdminUserRecord; mode: 'grant' | 'revoke' }) => void;
  pendingSubscriptionUserIds: Set<string>;
}) => {
  const roleKey = (user.role ?? 'user').toLowerCase();
  const isSelf = currentUserId === user.id;
  const bootstrapEditable = bootstrapPromote && isSelf && roleKey !== 'owner';
  const canEdit = (() => {
    if (isManagerRole) return false;
    if (bootstrapEditable) return true;
    if (isSelf) return false;
    if (isOwner) return true;
    if (actorRole === 'admin' && roleKey !== 'owner') return true;
    return false;
  })();
  const isUpdating = pendingRoleUserIds.has(user.id);
  const isDeleting = pendingDeleteUserId === user.id;
  const isSubscriptionUpdating = pendingSubscriptionUserIds.has(user.id);
  const isMutatingIdentity = isUpdating || isDeleting;
  const canRevokeGrantedSubscription =
    user.active_subscription_source === 'legacy' || user.active_subscription_source === 'gift';
  const canGrantSubscription = !(user.is_subscriber ?? false);
  const canManageSubscription = canGrantSubscription || canRevokeGrantedSubscription;

  const canDelete = (() => {
    if (isManagerRole) return false;
    if (isSelf) return false;
    if (actorRole === 'owner') return true;
    if (actorRole === 'admin') return roleKey !== 'owner';
    return false;
  })();

  const roleOptions: { value: UserRoleValue; label: string }[] = [
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'expert', label: 'Expert' },
    { value: 'user', label: 'User' },
  ];

  const availableOptions = isOwner
    ? roleOptions
    : bootstrapEditable
      ? roleOptions.filter((option) => option.value === 'owner')
      : roleOptions;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900">{user.name || 'Member'}</p>
          {(user.is_subscriber ?? false) ? (
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Subscriber</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{user.phone_number ?? '—'}</TableCell>
      <TableCell>
        {canEdit ? (
          <Select
            value={roleKey}
            onValueChange={(value) => {
              void onChangeRole(user.id, value as UserRoleValue);
            }}
            disabled={isMutatingIdentity}
          >
            <SelectTrigger className="w-36 justify-start">
              <SelectValue>{roleLabels[roleKey] ?? 'User'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary" className={roleColors[roleKey] ?? 'bg-gray-100 text-gray-700'}>
            {roleLabels[roleKey] ?? 'User'}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(user.created_at).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {!isManagerRole && canManageSubscription ? (
            <Button
              variant={canRevokeGrantedSubscription ? 'outline' : 'secondary'}
              size="sm"
              onClick={() =>
                onManageSubscription({
                  user,
                  mode: canRevokeGrantedSubscription ? 'revoke' : 'grant',
                })
              }
              disabled={isSubscriptionUpdating || isMutatingIdentity}
            >
              {isSubscriptionUpdating ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Updating…
                </>
              ) : canRevokeGrantedSubscription ? (
                <>
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Revoke Sub
                </>
              ) : (
                <>
                  <Gift className="mr-1 h-3 w-3" />
                  Grant Sub
                </>
              )}
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onRequestDelete({ user })}
              disabled={isMutatingIdentity}
            >
              {isDeleting ? 'Removing…' : 'Delete'}
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default AdminUsersPage;
