import { ArrowLeft, FolderPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SeriesForm } from '@/features/series';
import { useCreateSeries } from '@/features/series/hooks/useSeries';
import { mapSeriesFormToPayload, type SeriesFormPricingValues } from '@/features/series/utils/seriesPricing';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

function NewSeriesPage() {
  const navigate = useNavigate();
  const createMutation = useCreateSeries();

  const handleSubmit = async (values: SeriesFormPricingValues) => {
    await createMutation.mutateAsync(mapSeriesFormToPayload(values));
    navigate('/admin/library?tab=series');
  };

  const handleCancel = () => {
    navigate('/admin/library?tab=series');
  };

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/library')}
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                <FolderPlus className="h-5 w-5 text-[#05ef62]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Create Series</h1>
                <p className="text-neutral-600">
                  Group related library content into a series for members to explore.
                </p>
              </div>
            </div>
          </div>

          <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg text-neutral-900">Series Details</CardTitle>
              <CardDescription className="text-neutral-600">
                Enter the basic information for your new series.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SeriesForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={createMutation.isPending}
              />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </AdminProtectedRoute>
  );
}

export default NewSeriesPage;
