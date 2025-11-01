import { PlusCircle } from 'lucide-react';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryList } from '@/app/hooks/useLibraryAssets';
import LibraryGrid from '@/features/library/components/LibraryGrid';
import { useDeleteLibraryAsset } from '@/features/library/hooks/useLibrary';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';

// Bug #14 Fix: Replace mock data with actual database queries
interface LibraryItem {
  id: string;
  title: string;
  description: string | null;
  file_type: string;
  video_url?: string | null;
  document_url?: string | null;
  embed_url?: string | null;
  embed_type?: string | null;
  file_url?: string | null; // Legacy field
  created_at: string;
}

/**
 * Bug #15 Fix: Standardized component using function declaration
 * Bug #16 Fix: Library management component with comprehensive interface documentation
 */
function LibraryManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const deleteMutation = useDeleteLibraryAsset();
  const { canManageContent, canDeleteContent, loading: roleLoading } = useRolePermissions();

  // Query library assets (first 50 items; API caps pageSize at 50).
  const { data: assetsData, isLoading, isError, error } = useLibraryList(1, 50);

  // Show error toast if needed
  React.useEffect(() => {
    if (isError) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load library items.';
      toast({
        title: 'Error',
        description: `${errorMessage} Please try again later.`,
        variant: 'destructive',
      });
    }
  }, [isError, error, toast]);

  // Transform library items to match LibraryGrid expected format
  const transformedItems = useMemo(
    () =>
      (assetsData?.items ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        file_type: item.file_type,
        video_url: item.video_url,
        document_url: item.document_url,
        embed_url: item.embed_url,
        embed_type: item.embed_type,
        file_url: item.file_url, // Legacy field for backward compatibility
        created_at: item.created_at,
        view_count: item.view_count,
        download_count: item.download_count,
      })),
    [assetsData?.items],
  );

  const handleEdit = (itemId: string | number) => {
    // Ensure itemId is properly formatted for URL
    const id = String(itemId).trim();
    if (id && id !== 'undefined' && id !== 'null') {
      navigate(`/admin/library/edit/${id}`);
    } else {
      toast({
        title: 'Error',
        description: 'Invalid item ID',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (itemId: string | number) => {
    if (!canDeleteContent) {
      toast({
        title: 'Insufficient permissions',
        description: 'Only owners and admins can delete library assets.',
        variant: 'destructive',
      });
      return;
    }

    if (deleteMutation.isPending) {
      toast({
        title: 'Please wait',
        description: 'Deleting the selected asset…',
      });
      return;
    }

    const id = String(itemId).trim();

    if (!id || id === 'undefined' || id === 'null') {
      toast({
        title: 'Error',
        description: 'Invalid item ID',
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm('Remove this library asset for all members?');
    if (!confirmed) return;

    deleteMutation.mutate(id);
  };

  const handleAddNew = () => {
    navigate('/admin/library/new-item');
  };

  if (isLoading) {
    return (
      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
        <AdminLayout>
          <LoadingSpinner size="lg" text="Loading library items..." />
        </AdminLayout>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AdminLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Library Management</h1>
              <p className="mt-2 text-gray-600">
                Publish recordings, templates, and resources so members can revisit every session.
              </p>
            </div>

            <Button
              onClick={handleAddNew}
              className="flex items-center gap-2"
              disabled={!canManageContent || roleLoading}
            >
              <PlusCircle className="h-4 w-4" />
              Add asset
            </Button>
          </div>

          {/* Library Items Grid */}
          <div className="max-w-6xl">
            <LibraryGrid
              items={transformedItems}
              onEdit={handleEdit}
              onDelete={canDeleteContent ? handleDelete : undefined}
              onAddNew={handleAddNew}
              canManage={canManageContent}
              canDelete={canDeleteContent}
            />
          </div>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}

export default LibraryManagement;
