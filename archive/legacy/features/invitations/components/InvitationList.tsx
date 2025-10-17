import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Input } from '@/shared/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { useToast } from '@/shared/components/ui/use-toast';
import { useInvitations } from '../hooks/useInvitations';
import type { Invitation, InvitationFilters } from '../types';

interface InvitationListProps {
  filters?: InvitationFilters;
  showRetryActions?: boolean;
  pageSize?: number;
}

export function InvitationList({
  filters,
  showRetryActions = false,
  pageSize = 10,
}: InvitationListProps) {
  const { toast } = useToast();

  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [invitationToDelete, setInvitationToDelete] = useState<Invitation | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Debounce search input to prevent excessive re-renders
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Memoize filters object to prevent unnecessary re-renders and query re-fetches
  const combinedFilters = useMemo<InvitationFilters>(
    () => ({
      ...filters,
      search: debouncedSearchQuery.trim() || undefined,
    }),
    [filters, debouncedSearchQuery],
  );

  // Memoize callbacks to prevent hook re-initialization
  const invitationCallbacks = useMemo(
    () => ({
      onDeleteSuccess: () => {
        // Dialog is already closed in handleDeleteConfirm
        // This is just for additional cleanup if needed
      },
      onDeleteError: () => {
        // Dialog is already closed in handleDeleteConfirm
        // This is just for additional cleanup if needed
      },
    }),
    [],
  ); // Empty dependency array - callbacks never change

  // Hooks
  const {
    invitations,
    totalInvitations,
    totalPages,
    isLoading,
    error,
    hasPermissionError,
    refetch,
    resendInvitation,
    deleteInvitation,
    isResending,
    isDeleting,
  } = useInvitations(currentPage, pageSize, combinedFilters, invitationCallbacks);

  // Handlers
  const handleResend = (invitation: Invitation) => {
    resendInvitation(invitation.id);
  };

  const handleDeleteConfirm = async () => {
    if (!invitationToDelete || isDeleting) return; // Prevent multiple simultaneous deletions

    try {
      // Delete the invitation
      await deleteInvitation(invitationToDelete.id);
    } catch (error) {
      // Error is already handled by the mutation
      console.error('Delete operation error:', error);
    } finally {
      // ALWAYS close the dialog to prevent UI freeze
      // This ensures dialog closes even if callbacks fail
      setTimeout(() => {
        setIsDeleteDialogOpen(false);
        setInvitationToDelete(null);
      }, 100);
    }
  };

  const handleViewDetails = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    setIsDetailsModalOpen(true);
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({
      title: 'Copied',
      description: 'Invitation token copied to clipboard',
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default';
      case 'sent':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'outline';
      case 'expired':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) {
      return '-';
    }
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingSpinner text="Loading invitations..." />
        </CardContent>
      </Card>
    );
  }

  // Enhanced error handling with better categorization
  if (error || hasPermissionError) {
    const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
    const isPermissionError =
      hasPermissionError ||
      errorMessage.includes('permission') ||
      errorMessage.includes('auth') ||
      errorMessage.includes('admin user') ||
      errorMessage.includes('not properly configured');

    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className={`${isPermissionError ? 'text-amber-600' : 'text-red-600'}`}>
              {isPermissionError ? (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
                  <p className="text-sm leading-relaxed">
                    You don't have permission to view invitations. This requires admin access.
                  </p>
                  <p className="text-xs text-amber-500 mt-2">
                    If you believe this is an error, please contact your system administrator.
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Error Loading Invitations</h3>
                  <p className="text-sm leading-relaxed">{errorMessage}</p>
                  {process.env.NODE_ENV === 'development' && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer">Debug Info</summary>
                      <pre className="text-left bg-gray-100 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify({ error, hasPermissionError, errorMessage }, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => refetch()} className="" disabled={isPermissionError} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                {isPermissionError ? 'Contact Administrator' : 'Try Again'}
              </Button>
              {!isPermissionError && (
                <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                  Refresh Page
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="text-sm text-gray-500">{totalInvitations} total invitations</div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Mail className="h-12 w-12 text-gray-400" />
                      <div className="space-y-1">
                        <p className="text-gray-900 font-medium">
                          {searchQuery ? 'No matching invitations' : 'No invitations yet'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {searchQuery
                            ? `No invitations found matching "${searchQuery}"`
                            : 'Create your first invitation to get started'}
                        </p>
                      </div>
                      {searchQuery ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchQuery('')}
                          className="mt-1"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear Search
                        </Button>
                      ) : (
                        <div className="text-xs text-gray-400 mt-1">
                          Total: {totalInvitations} invitations
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {invitation.first_name} {invitation.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{invitation.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(invitation.status)}>
                        {invitation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invitation.sent_at ? formatDate(invitation.sent_at) : '-'}
                    </TableCell>
                    <TableCell>{formatDate(invitation.expires_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Resend button for failed/expired invitations */}
                        {showRetryActions &&
                          (invitation.status === 'failed' || invitation.status === 'expired') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResend(invitation)}
                              disabled={isResending}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}

                        {/* More actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewDetails(invitation)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>

                            {invitation.status !== 'accepted' && (
                              <DropdownMenuItem
                                onClick={() => handleResend(invitation)}
                                className="flex items-center gap-2"
                                disabled={isResending}
                              >
                                <RefreshCw className="h-4 w-4" />
                                Resend
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => handleCopyToken(invitation.token)}
                              className="flex items-center gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Copy Token
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setInvitationToDelete(invitation);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="flex items-center gap-2 text-red-600"
                              disabled={isDeleting}
                            >
                              <X className="h-4 w-4" />
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
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
      )}

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invitation Details</DialogTitle>
            <DialogDescription>Detailed information about this invitation</DialogDescription>
          </DialogHeader>

          {selectedInvitation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Recipient</h4>
                  <p className="text-sm text-gray-600">
                    {selectedInvitation.first_name} {selectedInvitation.last_name}
                  </p>
                  <p className="text-sm text-gray-600">{selectedInvitation.email}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Status</h4>
                  <Badge variant={getStatusBadgeVariant(selectedInvitation.status)}>
                    {selectedInvitation.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Created</h4>
                  <p className="text-sm text-gray-600">
                    {formatDate(selectedInvitation.created_at)}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Expires</h4>
                  <p className="text-sm text-gray-600">
                    {formatDate(selectedInvitation.expires_at)}
                  </p>
                </div>
              </div>

              {selectedInvitation.sent_at && (
                <div>
                  <h4 className="font-medium text-gray-900">Sent</h4>
                  <p className="text-sm text-gray-600">{formatDate(selectedInvitation.sent_at)}</p>
                </div>
              )}

              {selectedInvitation.accepted_at && (
                <div>
                  <h4 className="font-medium text-gray-900">Accepted</h4>
                  <p className="text-sm text-gray-600">
                    {formatDate(selectedInvitation.accepted_at)}
                  </p>
                </div>
              )}

              {selectedInvitation.custom_message && (
                <div>
                  <h4 className="font-medium text-gray-900">Custom Message</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {selectedInvitation.custom_message}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-900">Invitation Token</h4>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1">
                    {selectedInvitation.token}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyToken(selectedInvitation.token)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the invitation for{' '}
              <strong>
                {invitationToDelete?.first_name} {invitationToDelete?.last_name}
              </strong>
              ? This will completely remove the invitation record from the database. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Invitation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
