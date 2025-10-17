import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search, Shield } from 'lucide-react';
import { useMemo, useState } from 'react';
import { type AdminUserRecord, fetchUsersAdmin } from '@/app/api/users';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
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

const PAGE_SIZE = 10;

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  user: 'Member',
};

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  user: 'bg-green-100 text-green-800',
};

const AdminUsersPage = () => {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'user'>('all');

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

  const filteredUsers = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((user) => {
      const matchesRole =
        roleFilter === 'all' || (user.role ?? 'user').toLowerCase() === roleFilter;
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
    <AdminProtectedRoute>
      <AdminLayout>
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <Shield className="h-5 w-5" />
                Member Directory
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                View and filter community members. Role changes will be handled in a future update.
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
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="manager">Managers</SelectItem>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <AdminUserRow key={user.id} user={user} />
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
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

const AdminUserRow = ({ user }: { user: AdminUserRecord }) => {
  const roleKey = (user.role ?? 'user').toLowerCase();
  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium text-gray-900">{user.name || 'Member'}</p>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
      <TableCell>
        <Badge variant="secondary" className={roleColors[roleKey] ?? 'bg-gray-100 text-gray-700'}>
          {roleLabels[roleKey] ?? 'Member'}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(user.created_at).toLocaleDateString()}
      </TableCell>
    </TableRow>
  );
};

export default AdminUsersPage;
