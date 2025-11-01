import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LibraryAssetForm } from '@/features/library/components/LibraryAssetForm';
import { useCreateLibraryAsset } from '@/features/library/hooks/useLibrary';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

const NewLibraryItemPage = () => {
  const navigate = useNavigate();
  const createAsset = useCreateLibraryAsset();

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AdminLayout>
        <Card className="mx-auto max-w-4xl">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">Add library asset</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upload event recordings, PDFs, or slide decks for members to revisit.
                </p>
                <p className="text-xs text-muted-foreground">
                  Reference <code>docs/admin-content-workflow.md</code> for storage prep and QA
                  steps.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <LibraryAssetForm
              submitLabel="Create asset"
              isSubmitting={createAsset.isPending}
              onSubmit={async (payload) => {
                try {
                  const asset = await createAsset.mutateAsync(payload);
                  navigate(`/admin/library/${asset.id}`);
                } catch {
                  // toast already displayed by mutation
                }
              }}
            />
          </CardContent>
        </Card>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default NewLibraryItemPage;
