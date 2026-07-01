import {
  ArrowLeft,
  FileText,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Presentation,
  Trash2,
  Video,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SeriesAssetSelector, SeriesForm } from '@/features/series';
import SeriesAccessManager from '@/features/series/components/SeriesAccessManager';
import {
  useAddAssetsToSeries,
  useDeleteSeries,
  useRemoveAssetFromSeries,
  useSeriesDetail,
  useUpdateSeries,
} from '@/features/series/hooks/useSeries';
import { mapSeriesFormToPayload, type SeriesFormPricingValues } from '@/features/series/utils/seriesPricing';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
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
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';

const getAssetIcon = (fileType: string) => {
  switch (fileType) {
    case 'Video':
      return <Video className="h-3 w-3" />;
    case 'Presentation':
      return <Presentation className="h-3 w-3" />;
    default:
      return <FileText className="h-3 w-3" />;
  }
};

function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const { canDeleteContent } = useRolePermissions();

  const { data: series, isLoading, isError } = useSeriesDetail(id || '');
  const updateMutation = useUpdateSeries();
  const deleteMutation = useDeleteSeries();
  const addAssetsMutation = useAddAssetsToSeries();
  const removeAssetMutation = useRemoveAssetFromSeries();

  if (isLoading) {
    return (
      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
        <AppLayout variant="admin">
          <LoadingSpinner size="lg" text="Loading series..." />
        </AppLayout>
      </AdminProtectedRoute>
    );
  }

  if (isError || !series) {
    return (
      <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
        <AppLayout variant="admin">
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">Series not found</p>
            <Button variant="outline" onClick={() => navigate('/admin/library')} className="mt-4">
              Back to Recordings
            </Button>
          </div>
        </AppLayout>
      </AdminProtectedRoute>
    );
  }

  const handleUpdateSeries = async (values: SeriesFormPricingValues) => {
    try {
      await updateMutation.mutateAsync({
        id: series.id,
        data: mapSeriesFormToPayload(values),
      });
    } catch {
      // Mutation onError already reports a toast.
    }
  };

  const handleDeleteSeries = () => {
    if (!canDeleteContent) {
      toast({
        title: 'Insufficient permissions',
        description: 'Only owners and admins can delete series.',
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm('Delete this series? The assets will remain in the library.');
    if (!confirmed) return;

    deleteMutation.mutate(series.id, {
      onSuccess: () => navigate('/admin/library'),
    });
  };

  const handleAddAssets = (assetIds: string[]) => {
    addAssetsMutation.mutate(
      { seriesId: series.id, assetIds },
      { onSuccess: () => setShowAssetSelector(false) },
    );
  };

  const handleRemoveAsset = (assetId: string) => {
    const confirmed = window.confirm('Remove this asset from the series?');
    if (!confirmed) return;
    removeAssetMutation.mutate({ seriesId: series.id, assetId });
  };

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
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
                  <FolderOpen className="h-5 w-5 text-[#05ef62]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">{series.title}</h1>
                  <p className="text-neutral-600">{series.asset_count} assets</p>
                </div>
              </div>
            </div>

            {canDeleteContent && (
              <Button
                variant="destructive"
                onClick={handleDeleteSeries}
                disabled={deleteMutation.isPending}
                className="rounded-xl"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete Series
              </Button>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Series Details */}
            <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg text-neutral-900">Series Details</CardTitle>
                <CardDescription className="text-neutral-600">
                  Update the series information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SeriesForm
                  series={series}
                  onSubmit={handleUpdateSeries}
                  onCancel={() => navigate('/admin/library')}
                  isLoading={updateMutation.isPending}
                />
              </CardContent>
            </Card>

            {/* Assets in Series */}
            <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-neutral-900">Assets in Series</CardTitle>
                    <CardDescription className="text-neutral-600">
                      Recording assets included in this series. Displayed to members in the order
                      shown below.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowAssetSelector(true)}
                    className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010] font-medium shadow-sm hover:shadow-md hover:scale-105 transition-all"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Assets
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {series.assets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 text-center">
                    <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No assets in this series yet</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setShowAssetSelector(true)}
                    >
                      Add your first asset
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {series.assets.map((asset, index) => (
                      <div
                        key={asset.id}
                        className="flex items-center gap-3 rounded-lg border bg-white p-3"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-neutral-100 text-xs font-medium text-neutral-600">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{asset.title}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {getAssetIcon(asset.file_type)}
                            <span>{asset.file_type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => navigate(`/admin/library/edit/${asset.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveAsset(asset.id)}
                            disabled={removeAssetMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {series.is_premium ? (
            <SeriesAccessManager seriesId={series.id} seriesTitle={series.title} />
          ) : null}
        </div>

        {/* Asset Selector Modal */}
        <SeriesAssetSelector
          open={showAssetSelector}
          onOpenChange={setShowAssetSelector}
          existingAssetIds={series.assets.map((a) => a.id)}
          onSelect={handleAddAssets}
          isLoading={addAssetsMutation.isPending}
        />
      </AppLayout>
    </AdminProtectedRoute>
  );
}

export default SeriesDetailPage;
