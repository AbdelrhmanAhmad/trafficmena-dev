import DOMPurify from 'dompurify';
import { ArrowRight, BookOpen, FolderOpen, Lock, Play } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SeriesBuyActions } from '@/features/series/components/SeriesBuyActions';
import SeriesPriceBadge from '@/features/series/components/SeriesPriceBadge';
import SeriesPurchasedBadge from '@/features/series/components/SeriesPurchasedBadge';
import { useStoreSeriesDetail } from '@/features/series/hooks/useSeries';
import { canShowSeriesPurchaseActions } from '@/features/series/utils/seriesPricing';
import Layout from '@/shared/components/layout/Layout';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { SignInRequiredDialog } from '@/shared/components/SignInRequiredDialog';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { useAuth } from '@/shared/context/AuthContext';

type SanitizedHtmlProps = {
  className?: string;
  html: string;
};

const SanitizedDescription = ({ className, html }: SanitizedHtmlProps) => (
  <div
    className={className}
    // biome-ignore lint/security/noDangerouslySetInnerHtml: series descriptions are sanitized with DOMPurify
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

const PublicRecordingDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { data: series, isLoading, isError } = useStoreSeriesDetail(id);

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner size="lg" text="Loading recording..." />
      </Layout>
    );
  }

  if (isError || !series) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-lg text-muted-foreground">Recording not available.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/recordings')}>
            Back to recordings
          </Button>
        </div>
      </Layout>
    );
  }

  const returnPath = `/recordings/${series.id}`;
  const sanitizedDescription = series.description
    ? DOMPurify.sanitize(series.description)
    : null;
  const canPurchase = canShowSeriesPurchaseActions(series);
  const hasDashboardAccess = series.has_purchased || series.has_access;

  return (
    <Layout>
      <SignInRequiredDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        returnPath={returnPath}
        description="You need to sign in before continuing. Create a free account or sign in to purchase recordings and access your dashboard."
      />
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -left-[40vw] top-[-20vh] -z-10 h-[50vh] w-[80vw] rounded-full bg-gradient-to-br from-indigo-100/60 to-transparent blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/recordings')}>
              Back to recordings
            </Button>
            <Link to="/series/cart" className="text-sm text-indigo-600 hover:underline">
              View cart
            </Link>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)]">
            {series.image_url && (
              <div className="aspect-[21/9] overflow-hidden">
                <img
                  src={series.image_url}
                  alt={series.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/90 px-3 py-1 text-xs font-medium text-white">
                  <FolderOpen className="h-3 w-3" />
                  Recording
                </span>
                {series.has_purchased && <SeriesPurchasedBadge />}
                <SeriesPriceBadge series={series} />
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                {series.title}
              </h1>

              {sanitizedDescription && (
                <SanitizedDescription
                  className="prose prose-neutral mt-4 max-w-none text-neutral-600"
                  html={sanitizedDescription}
                />
              )}

              <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
                <BookOpen className="h-4 w-4" />
                {series.asset_count} {series.asset_count === 1 ? 'recording' : 'recordings'} included
              </p>

              {!hasDashboardAccess && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Preview only — purchase to unlock full recordings permanently in your dashboard.
                  This does not include live track booking.
                </div>
              )}

              <div className="mt-6">
                {hasDashboardAccess ? (
                  user ? (
                    <Button
                      asChild
                      className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010] hover:brightness-95"
                    >
                      <Link to={`/dashboard/library/series/${series.id}`}>
                        Open in dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010] hover:brightness-95"
                      onClick={() => setAuthDialogOpen(true)}
                    >
                      Open in dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )
                ) : canPurchase ? (
                  <SeriesBuyActions
                    series={series}
                    layout="stack"
                    signInReturnPath={returnPath}
                    onSuccessPath={`/dashboard/library/series/${series.id}`}
                    onRequireAuth={() => setAuthDialogOpen(true)}
                  />
                ) : null}
              </div>
            </div>
          </div>

          {series.assets.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-neutral-900">What&apos;s included</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {series.assets.map((asset) => (
                  <Card key={asset.id} className="overflow-hidden rounded-2xl">
                    <div className="relative aspect-video bg-neutral-100">
                      {asset.thumbnail_url ? (
                        <img
                          src={asset.thumbnail_url}
                          alt={asset.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-neutral-300">
                          <Play className="h-10 w-10" />
                        </div>
                      )}
                      {!asset.has_access && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                          <div className="rounded-full bg-white/90 p-3">
                            <Lock className="h-5 w-5 text-neutral-800" />
                          </div>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <p className="font-medium text-neutral-900">{asset.title}</p>
                      <p className="text-xs text-neutral-500">
                        {asset.embed_type || asset.file_type}
                        {!asset.has_access ? ' · Unlock after purchase' : ''}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PublicRecordingDetailPage;
