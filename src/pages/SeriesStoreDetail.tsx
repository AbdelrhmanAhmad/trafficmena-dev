import { BookOpen, FolderOpen, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchStoreSeriesById } from '@/app/api/series';
import { SeriesBuyActions } from '@/features/series/components/SeriesBuyActions';
import SeriesPriceBadge from '@/features/series/components/SeriesPriceBadge';
import SeriesPurchasedBadge from '@/features/series/components/SeriesPurchasedBadge';
import Layout from '@/shared/components/layout/Layout';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';

export default function SeriesStoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: series, isLoading, isError } = useQuery({
    queryKey: ['series-store', id],
    queryFn: () => fetchStoreSeriesById(id!),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner size="lg" text="Loading series..." />
      </Layout>
    );
  }

  if (isError || !series) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl py-16 text-center">
          <p className="text-lg text-muted-foreground">Series not available for purchase.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
            Back home
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Link to="/series/cart" className="text-sm text-indigo-600 hover:underline">
            View cart
          </Link>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)]">
          {series.image_url && (
            <div className="aspect-[21/9] overflow-hidden">
              <img src={series.image_url} alt={series.title} className="h-full w-full object-cover" />
            </div>
          )}
          <div className="p-8">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/90 px-3 py-1 text-xs font-medium text-white">
                <FolderOpen className="h-3 w-3" />
                Recording Series
              </span>
              {series.has_purchased && <SeriesPurchasedBadge />}
              <SeriesPriceBadge series={series} />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900">{series.title}</h1>
            {series.description && (
              <p className="mt-3 text-neutral-600 whitespace-pre-wrap">{series.description}</p>
            )}
            <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
              <BookOpen className="h-4 w-4" />
              {series.asset_count} recordings included
            </p>

            {!series.has_access && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Preview only — purchase to unlock full recordings permanently.
              </div>
            )}

            <div className="mt-6">
              <SeriesBuyActions series={series} layout="stack" />
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">What&apos;s included</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {series.assets.map((asset) => (
              <Card key={asset.id} className="overflow-hidden rounded-2xl">
                <div className="relative aspect-video bg-neutral-100">
                  {asset.thumbnail_url ? (
                    <img
                      src={asset.thumbnail_url}
                      alt={asset.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  {!asset.has_access && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Lock className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <p className="font-medium text-neutral-900">{asset.title}</p>
                  <p className="text-xs text-neutral-500">{asset.file_type}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
