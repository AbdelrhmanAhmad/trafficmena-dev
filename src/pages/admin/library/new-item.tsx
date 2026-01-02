import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LibraryAssetForm } from '@/features/library/components/LibraryAssetForm';
import { useCreateLibraryAsset } from '@/features/library/hooks/useLibrary';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

const NewLibraryItemPage = () => {
  const navigate = useNavigate();
  const createAsset = useCreateLibraryAsset();

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <Card className="mx-auto max-w-4xl rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                <BookOpen className="h-5 w-5 text-[#05ef62]" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-neutral-900">
                  Add library asset
                </CardTitle>
                <p className="text-sm text-neutral-600">
                  Upload event recordings, PDFs, or slide decks for members to revisit.
                </p>
                <p className="text-xs text-neutral-500">
                  Reference{' '}
                  <code className="rounded bg-neutral-100 px-1 py-0.5">
                    docs/admin-content-workflow.md
                  </code>{' '}
                  for storage prep and QA steps.
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
      </AppLayout>
    </AdminProtectedRoute>
  );
};

export default NewLibraryItemPage;
