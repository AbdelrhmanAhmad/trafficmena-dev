import {
  ArrowLeft,
  BookOpen,
  FileText,
  FolderOpen,
  Lock,
  Play,
  Presentation,
  Video,
  Youtube,
} from 'lucide-react';
import type React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { SeriesAsset } from '@/features/series';
import { SeriesBuyActions } from '@/features/series/components/SeriesBuyActions';
import SeriesPriceBadge from '@/features/series/components/SeriesPriceBadge';
import SeriesPurchasedBadge from '@/features/series/components/SeriesPurchasedBadge';
import { isSeriesPurchasable } from '@/features/series/utils/seriesPricing';
import { useSeriesDetail } from '@/features/series/hooks/useSeries';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AppLayout from '@/shared/components/layout/AppLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import PremiumContentGate from '@/shared/components/PremiumContentGate';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';

const getAssetTypeStyles = (fileType: string, embedType?: string | null) => {
  if (embedType?.toLowerCase().includes('youtube')) {
    return {
      gradient: 'from-red-50 to-rose-100',
      icon: <Youtube className="h-12 w-12 text-red-600" />,
      badgeColor: 'bg-red-100 text-red-700',
    };
  }

  switch (fileType) {
    case 'Video':
      return {
        gradient: 'from-blue-50 to-sky-100',
        icon: <Video className="h-12 w-12 text-blue-600" />,
        badgeColor: 'bg-blue-100 text-blue-700',
      };
    case 'Presentation':
      return {
        gradient: 'from-purple-50 to-violet-100',
        icon: <Presentation className="h-12 w-12 text-purple-600" />,
        badgeColor: 'bg-purple-100 text-purple-700',
      };
    default:
      return {
        gradient: 'from-gray-100 to-gray-200',
        icon: <FileText className="h-12 w-12 text-gray-600" />,
        badgeColor: 'bg-amber-100 text-amber-700',
      };
  }
};

const SeriesResourceCard: React.FC<{
  asset: SeriesAsset;
  isSeriesPremium: boolean;
  seriesId: string;
  seriesTitle: string;
}> = ({ asset, isSeriesPremium, seriesId, seriesTitle }) => {
  const navigate = useNavigate();
  const isVideo =
    asset.file_type === 'Video' || asset.embed_type?.toLowerCase().includes('youtube');
  const styles = getAssetTypeStyles(asset.file_type, asset.embed_type);
  const isPremium = isSeriesPremium || asset.is_premium;
  const hasAccess = asset.has_access !== false;
  const showPremiumOverlay = isPremium && !hasAccess;
  const showPremiumBadge = isPremium;

  return (
    <button
      type="button"
      onClick={() => {
        navigate(`/dashboard/library/${asset.id}`, {
          state: {
            seriesContext: {
              id: seriesId,
              title: seriesTitle,
            },
          },
        });
      }}
      className="group cursor-pointer rounded-[28px] border border-neutral-200 bg-white/95 text-left shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-xl overflow-hidden"
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-[300/160] overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient}`} />

        {asset.thumbnail_url && (
          <img
            src={asset.thumbnail_url}
            alt={asset.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {!asset.thumbnail_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/80 shadow-lg">
              {styles.icon}
            </div>
          </div>
        )}

        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110">
              <Play className="h-6 w-6 text-neutral-800 ml-1" fill="currentColor" />
            </div>
          </div>
        )}

        {showPremiumOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/10">
            <div className="flex flex-col items-center gap-2 text-neutral-900/60">
              <Lock className="h-12 w-12" />
              <span className="text-lg font-semibold">Premium</span>
            </div>
          </div>
        )}

        <div className="absolute left-3 top-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${styles.badgeColor} backdrop-blur-sm`}
          >
            {asset.embed_type || asset.file_type}
          </span>
        </div>

        {showPremiumBadge && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <Lock className="h-3 w-3" />
              Premium
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-neutral-900 line-clamp-2">{asset.title}</h3>
        <p className="mt-1 text-sm text-neutral-500">{asset.file_type}</p>
      </div>
    </button>
  );
};

const DashboardSeriesDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: series, isLoading, isError } = useSeriesDetail(id || '');

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout variant="member">
          <LoadingSpinner size="lg" text="Loading series..." />
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (isError || !series) {
    return (
      <ProtectedRoute>
        <AppLayout variant="member">
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">Series not found</p>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/library')}
              className="mt-4"
            >
              Back to Library
            </Button>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const canPurchase = isSeriesPurchasable(series) && !series.has_purchased;
  const showSellablePreview = series.has_access === false && canPurchase;

  if (series.has_access === false && !showSellablePreview) {
    return (
      <ProtectedRoute>
        <AppLayout variant="member">
          <PremiumContentGate contentName={series.title} />
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout variant="member">
        <div className="max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/library')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Button>

            <div className="relative overflow-hidden rounded-[28px] border border-neutral-200 bg-white/95 p-8 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
              {series.image_url && (
                <div className="absolute inset-0 opacity-10">
                  <img
                    src={series.image_url}
                    alt={series.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/90 text-white mb-4">
                      <FolderOpen className="h-3 w-3" />
                      Series
                    </span>
                    <h1 className="text-3xl font-bold text-neutral-900">{series.title}</h1>
                    {series.description && (
                      <p className="mt-2 text-neutral-600 max-w-2xl">{series.description}</p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                      {series.has_purchased && <SeriesPurchasedBadge />}
                      <SeriesPriceBadge series={series} />
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {series.asset_count} {series.asset_count === 1 ? 'resource' : 'resources'}
                      </span>
                    </div>
                    {canPurchase && (
                      <div className="mt-6 max-w-md">
                        <SeriesBuyActions series={series} layout="stack" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showSellablePreview && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Preview mode — purchase for permanent access to all recordings. This does not include
              live track booking.
            </div>
          )}

          {/* Resources */}
          {series.assets.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">Resources</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {series.assets.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {series.assets.map((asset) => (
                  <SeriesResourceCard
                    key={asset.id}
                    asset={asset}
                    isSeriesPremium={series.is_premium}
                    seriesId={series.id}
                    seriesTitle={series.title}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Card className="rounded-2xl border border-neutral-200 bg-white/95 shadow-sm">
              <CardContent className="py-12 text-center">
                <FolderOpen className="mx-auto h-12 w-12 text-neutral-300" />
                <p className="mt-4 text-muted-foreground">
                  No content has been added to this series yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default DashboardSeriesDetail;
