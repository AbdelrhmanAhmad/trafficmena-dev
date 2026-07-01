import { BookOpen, FolderPlus, PlusCircle } from 'lucide-react';
import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLibraryList } from '@/app/hooks/useLibraryAssets';
import LibraryGrid from '@/features/library/components/LibraryGrid';
import { useDeleteLibraryAsset } from '@/features/library/hooks/useLibrary';
import { SeriesGrid } from '@/features/series';
import { useDeleteSeries, useSeries, useUpdateSeries } from '@/features/series/hooks/useSeries';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
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
  event_id?: string | null;
  is_public?: boolean;
  is_premium?: boolean;
  has_access?: boolean;
}

/**
 * Bug #15 Fix: Standardized component using function declaration
 * Bug #16 Fix: Library management component with comprehensive interface documentation
 */
function LibraryManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'series';
  const setActiveTab = (tab: string) => setSearchParams({ tab });
  const deleteMutation = useDeleteLibraryAsset();
  const deleteSeriesMutation = useDeleteSeries();
  const updateSeriesMutation = useUpdateSeries();
  const { canManageContent, canDeleteContent, loading: roleLoading } = useRolePermissions();

  // Query library assets (first 50 items; API caps pageSize at 50).
  // excludeInTracks: true filters out assets that are already part of a series
  const {
    data: assetsData,
    isLoading,
    isError,
    error,
  } = useLibraryList(1, 50, { excludeInTracks: true });

  // Query series
  const { data: seriesData, isLoading: seriesLoading } = useSeries(1, 50);

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
        event_id: item.event_id,
        is_public: item.is_public,
        is_premium: item.is_premium,
        has_access: item.has_access,
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
        description: 'Only owners and admins can delete recording assets.',
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

  const handleEditSeries = (seriesId: string) => {
    navigate(`/admin/library/series/${seriesId}`);
  };

  const handleDeleteSeries = (seriesId: string) => {
    if (!canDeleteContent) {
      toast({
        title: 'Insufficient permissions',
        description: 'Only owners and admins can delete series.',
        variant: 'destructive',
      });
      return;
    }

    if (deleteSeriesMutation.isPending) return;

    const confirmed = window.confirm('Delete this series? Assets will remain in the library.');
    if (!confirmed) return;

    deleteSeriesMutation.mutate(seriesId);
  };

  const handleAddSeries = () => {
    navigate('/admin/library/series/new');
  };

  const handleSeriesSalesToggle = (seriesId: string, salesEnabled: boolean) => {
    if (!canManageContent || updateSeriesMutation.isPending) return;

    updateSeriesMutation.mutate({
      id: seriesId,
      data: { salesEnabled },
    });
  };

  if (isLoading || seriesLoading) {
    return (
      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
        <AppLayout variant="admin">
          <LoadingSpinner size="lg" text="Loading library items..." />
        </AppLayout>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                  <BookOpen className="h-5 w-5 text-[#05ef62]" />
                </div>
                <h1 className="text-3xl font-bold text-neutral-900">Recording Management</h1>
              </div>
              <p className="text-neutral-600 ml-[52px]">
                Publish recordings, templates, and resources so members can revisit every session.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'series' ? (
                <Button
                  onClick={handleAddSeries}
                  className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-5 py-2.5 text-[#101010] font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  disabled={!canManageContent || roleLoading}
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create series
                </Button>
              ) : (
                <Button
                  onClick={handleAddNew}
                  className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-5 py-2.5 text-[#101010] font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  disabled={!canManageContent || roleLoading}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add asset
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6 rounded-xl bg-neutral-100 p-1">
              <TabsTrigger
                value="series"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Series
              </TabsTrigger>
              <TabsTrigger
                value="content"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Single Content
              </TabsTrigger>
            </TabsList>

            <TabsContent value="series" className="max-w-6xl">
              <SeriesGrid
                series={seriesData?.items ?? []}
                onEdit={handleEditSeries}
                onDelete={canDeleteContent ? handleDeleteSeries : undefined}
                onSalesToggle={canManageContent ? handleSeriesSalesToggle : undefined}
                isSalesTogglePending={updateSeriesMutation.isPending}
                onAddNew={handleAddSeries}
                canManage={canManageContent}
                canDelete={canDeleteContent}
                basePath="/admin/library/series"
              />
            </TabsContent>

            <TabsContent value="content" className="max-w-6xl">
              <LibraryGrid
                items={transformedItems}
                onEdit={handleEdit}
                onDelete={canDeleteContent ? handleDelete : undefined}
                onAddNew={handleAddNew}
                canManage={canManageContent}
                canDelete={canDeleteContent}
              />
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </AdminProtectedRoute>
  );
}

export default LibraryManagement;
