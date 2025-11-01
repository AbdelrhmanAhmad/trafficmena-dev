import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search, Shield } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AdminUserRecord, UserRoleValue } from '@/app/api/users';
import { deleteUser, fetchUsersAdmin, updateUserRole } from '@/app/api/users';
import { useCurrentUser } from '@/app/hooks/useCurrentUser';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
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

const PAGE_SIZE = 10;

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

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<
    'all' | 'owner' | 'admin' | 'manager' | 'expert' | 'user'
  >('all');
  const [deleteDialog, setDeleteDialog] = useState<{ user: AdminUserRecord } | null>(null);

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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => fetchUsersAdmin({ page, pageSize: PAGE_SIZE }),
    onError: () =>
      toast({
        title: 'Unable to load users',
        description: 'Please refresh the page or try again later.',
        variant: 'destructive',
      }),
    keepPreviousData: true,
  });

  const hasOwner = useMemo(
    () => data?.items?.some((user) => (user.role ?? 'user').toLowerCase() === 'owner') ?? false,
    [data?.items],
  );

  const bootstrapPromote = !hasOwner && currentRole === 'admin';

  const filteredUsers = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((user) => {
      const normalizedRole = (user.role ?? 'user').toLowerCase();
      const matchesRole = roleFilter === 'all' || normalizedRole === roleFilter;
      const query = search.trim().toLowerCase();
      if (!query) return matchesRole;
      return (
        matchesRole &&
        (`${user.name}`.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
      );
    });
  }, [data?.items, roleFilter, search]);

  const totalPages = data?.pagination.total
    ? Math.max(1, Math.ceil(data.pagination.total / PAGE_SIZE))
    : 1;

  const handlePrev = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  };

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin']}>
      <AdminLayout>
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <Shield className="h-5 w-5" />
                Member Directory
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                View and filter community members. Owners can adjust roles. If you&apos;re the first
                admin here, promote yourself to owner to unlock full controls.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or email"
                  className="pl-9"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(value: typeof roleFilter) => setRoleFilter(value)}
              >
                <SelectTrigger className="sm:w-40">
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
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
                Loading users…
              </div>
            ) : isError ? (
              <div className="flex min-h-[200px] items-center justify-center text-destructive">
                Unable to fetch users.
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
                No users match your filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <AdminUserRow
                      key={user.id}
                      user={user}
                      currentUserId={currentUser?.user?.id ?? null}
                      actorRole={currentRole}
                      isOwner={isOwner}
                      bootstrapPromote={bootstrapPromote}
                      onChangeRole={(userId, role) => roleMutation.mutate({ userId, role })}
                      pendingUserId={
                        roleMutation.isPending ? (roleMutation.variables?.userId ?? null) : null
                      }
                      onRequestDelete={(payload) => setDeleteDialog(payload)}
                      pendingDeleteUserId={
                        deleteMutation.isPending ? (deleteMutation.variables ?? null) : null
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredUsers.length} of {data?.pagination.total ?? 0} members
              </p>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={handlePrev} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
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
          </CardContent>
        </Card>

        <Dialog
          open={Boolean(deleteDialog)}
          onOpenChange={(open) => !open && setDeleteDialog(null)}
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
              <Button variant="outline" onClick={() => setDeleteDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteDialog) {
                    deleteMutation.mutate(deleteDialog.user.id);
                  }
                  setDeleteDialog(null);
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Removing…' : 'Delete member'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

const AdminUserRow = ({
  user,
  isOwner,
  bootstrapPromote,
  actorRole,
  currentUserId,
  onChangeRole,
  pendingUserId,
  pendingDeleteUserId,
  onRequestDelete,
}: {
  user: AdminUserRecord;
  isOwner: boolean;
  bootstrapPromote: boolean;
  actorRole: UserRoleValue | null;
  currentUserId: string | null;
  onChangeRole: (userId: string, role: UserRoleValue) => void;
  pendingUserId: string | null;
  pendingDeleteUserId: string | null;
  onRequestDelete: (payload: { user: AdminUserRecord }) => void;
}) => {
  const roleKey = (user.role ?? 'user').toLowerCase();
  const isSelf = currentUserId === user.id;
  const bootstrapEditable = bootstrapPromote && isSelf && roleKey !== 'owner';
  const canEdit = (isOwner && !isSelf) || bootstrapEditable;
  const isUpdating = pendingUserId === user.id;
  const isDeleting = pendingDeleteUserId === user.id;

  const canDelete = (() => {
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
        <div>
          <p className="font-semibold text-gray-900">{user.name || 'Member'}</p>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
      <TableCell>
        {canEdit ? (
          <Select
            value={roleKey}
            onValueChange={(value) => onChangeRole(user.id, value as UserRoleValue)}
            disabled={isUpdating}
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
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRequestDelete({ user })}
          disabled={!canDelete || isDeleting}
        >
          {isDeleting ? 'Removing…' : 'Delete'}
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default AdminUsersPage;
