
import React, { useState, useEffect, useCallback } from 'react';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { UserProfile, UserFilters } from '@/types';
import { useErrorHandler } from '@/utils/errorHandling';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    status: 'all'
  });
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  // Fetch users from database with cleanup
  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    const fetchUsers = async (page: number = 1) => {
      try {
        setLoading(true);
        
        // Calculate range for pagination
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE - 1;
        
        // Get total count first for pagination
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        if (count !== null) {
          setTotalUsers(count);
          setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
        }
        
        // Get users from profiles table with pagination
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            phone_number,
            role,
            subscription_status,
            email
          `)
          .range(startIndex, endIndex)
          .order('created_at', { ascending: false })
          .abortSignal(abortController.signal);

        if (!mounted) return;

        if (error) {
          const appError = handleError(error);
          toast({
            title: "Error",
            description: "Failed to load users. Please try again.",
            variant: "destructive",
          });
          return;
        }

        if (!mounted) return;

        // SECURITY FIX: Removed supabase.auth.admin.listUsers() call
        // This requires service role key which should NOT be in client-side code
        // Email data should be stored in profiles table or accessed via edge function
        
        // Use profile data with actual emails
        const combinedUsers: UserProfile[] = profiles || [];

        setUsers(combinedUsers);
        setCurrentPage(page);
      } catch (error) {
        if (!mounted || abortController.signal.aborted) return;
        
        const appError = handleError(error, 'Failed to fetch users');
        toast({
          title: "Error",
          description: "An unexpected error occurred while loading users.",
          variant: "destructive",
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchUsers(currentPage);

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [currentPage]); // Re-fetch when page changes

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const matchesSearch = fullName.toLowerCase().includes(filters.search.toLowerCase()) ||
                         user.email.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === 'all' || 
                         (user.subscription_status || 'free').toLowerCase() === filters.status;
    return matchesSearch && matchesStatus;
  });

  const updateFilters = useCallback((newFilters: Partial<UserFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const getStatusBadgeVariant = useCallback((status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'premium':
        return 'default';
      case 'expired':
      case 'free':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  }, []);

  if (loading) {
    return (
      <AdminProtectedRoute>
        <AdminLayout>
          <LoadingSpinner size="lg" text="Loading users..." />
        </AdminLayout>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">User Management</h1>
            <p className="text-gray-600 mt-2">
              Manage and view all registered users and their subscription status.
            </p>
          </div>

          {/* Filter Controls */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-primary mb-4">Filter Users</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name or email..."
                  value={filters.search}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="sm:w-48">
                <Select value={filters.status} onValueChange={(value) => updateFilters({ status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Subscription Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Users Data Table */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-primary">
                Users ({filteredUsers.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Subscription Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone_number || 'N/A'}</TableCell>
                      <TableCell>{user.role || 'Member'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.subscription_status)}>
                          {user.subscription_status || 'Free'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No users found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Controls */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {currentPage} of {totalPages} ({totalUsers} total users)
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, currentPage - 2) + i;
                      if (pageNum > totalPages) return null;
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default UserManagement;
