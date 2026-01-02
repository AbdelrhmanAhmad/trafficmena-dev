import { Pencil } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { LibraryAssetForm } from '@/features/library/components/LibraryAssetForm';
import {
  useDeleteLibraryAsset,
  useLibraryAsset,
  useUpdateLibraryAsset,
} from '@/features/library/hooks/useLibrary';
import DataLoader from '@/shared/components/DataLoader';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';

const EditLibraryItemPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useLibraryAsset(id ?? '');
  const updateAsset = useUpdateLibraryAsset();
  const deleteAsset = useDeleteLibraryAsset();
  const asset = data ?? null;
  const { canDeleteContent } = useRolePermissions();

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <Card className="mx-auto max-w-4xl">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Pencil className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">
                  {asset ? `Edit ${asset.title}` : 'Edit library asset'}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Update the title, links, or linked event before saving.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataLoader
              loading={isLoading}
              error={error ? 'Unable to load asset details.' : null}
              loadingText="Loading asset..."
            >
              {asset ? (
                <LibraryAssetForm
                  asset={asset}
                  submitLabel="Update asset"
                  isSubmitting={updateAsset.isPending}
                  isDeleting={deleteAsset.isPending}
                  canDelete={canDeleteContent}
                  onSubmit={async (payload) => {
                    try {
                      await updateAsset.mutateAsync({ id: asset.id, data: payload });
                    } catch {
                      // toast handled inside mutation hook
                    }
                  }}
                  onDelete={async () => {
                    if (!canDeleteContent) return;
                    const confirmed = window.confirm('Delete this asset? This cannot be undone.');
                    if (!confirmed) return;
                    try {
                      await deleteAsset.mutateAsync(asset.id);
                      navigate('/admin/library');
                    } catch {
                      // toast handled in mutation
                    }
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  This asset could not be found. It may have been removed.
                </p>
              )}
            </DataLoader>
          </CardContent>
        </Card>
      </AppLayout>
    </AdminProtectedRoute>
  );
};

export default EditLibraryItemPage;
