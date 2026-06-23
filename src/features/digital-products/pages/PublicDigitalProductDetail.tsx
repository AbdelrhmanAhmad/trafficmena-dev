import DOMPurify from 'dompurify';
import { ArrowRight, CheckCircle2, FileText, Lock, Play, Video } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DIGITAL_PRODUCT_FILE_TYPE_LABELS } from '@/app/api/digitalProducts';
import {
  DigitalProductBuyActions,
  DigitalProductPrice,
} from '@/features/digital-products/components/DigitalProductBuyActions';
import { usePublicDigitalProductDetail } from '@/features/digital-products/hooks/useDigitalProducts';
import Layout from '@/shared/components/layout/Layout';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { SignInRequiredDialog } from '@/shared/components/SignInRequiredDialog';
import { Badge } from '@/shared/components/ui/badge';
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
    // biome-ignore lint/security/noDangerouslySetInnerHtml: product descriptions are sanitized with DOMPurify
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

const PublicDigitalProductDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { data, isLoading, isError } = usePublicDigitalProductDetail(id);

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner size="lg" text="Loading product..." />
      </Layout>
    );
  }

  if (isError || !data) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-lg text-muted-foreground">Product not available.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/digital-products')}>
            Back to store
          </Button>
        </div>
      </Layout>
    );
  }

  const { product, files, videos } = data;
  const returnPath = `/digital-products/${product.id}`;
  const sanitizedDescription = product.description
    ? DOMPurify.sanitize(product.description)
    : null;

  return (
    <Layout>
      <SignInRequiredDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        returnPath={returnPath}
      />
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -left-[40vw] top-[-20vh] -z-10 h-[50vh] w-[80vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/60 to-transparent blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/digital-products')}>
              Back to store
            </Button>
            <Link to="/series/cart" className="text-sm text-[#29cf9f] hover:underline">
              View cart
            </Link>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)]">
            {product.image_url && (
              <div className="aspect-[21/9] overflow-hidden">
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-3 py-1 text-xs font-semibold text-[#101010]">
                  Digital Product
                </span>
                {product.is_purchased && (
                  <Badge className="gap-1 bg-[#29cf9f]">
                    <CheckCircle2 className="h-3 w-3" />
                    Purchased
                  </Badge>
                )}
                <DigitalProductPrice priceInCents={product.price_in_cents} />
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                {product.title}
              </h1>

              {sanitizedDescription && (
                <SanitizedDescription
                  className="prose prose-neutral mt-4 max-w-none text-neutral-600"
                  html={sanitizedDescription}
                />
              )}

              <p className="mt-4 text-sm text-neutral-500">
                {product.file_count} {product.file_count === 1 ? 'file' : 'files'}
                {videos.length > 0 &&
                  ` · ${videos.length} ${videos.length === 1 ? 'video' : 'videos'}`}
              </p>

              {!product.is_purchased && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Preview only purchase to unlock downloads and full video playback in your
                  dashboard.
                </div>
              )}

              <div className="mt-6">
                {product.is_purchased ? (
                  user ? (
                    <Button
                      asChild
                      className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010] hover:brightness-95"
                    >
                      <Link to={`/dashboard/digital-products/${product.id}`}>
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
                ) : (
                  <DigitalProductBuyActions
                    product={product}
                    layout="stack"
                    signInReturnPath={returnPath}
                    onSuccessPath={`/dashboard/digital-products/${product.id}`}
                    onRequireAuth={() => setAuthDialogOpen(true)}
                  />
                )}
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-neutral-900">What&apos;s included</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {files.map((file) => (
                  <Card key={file.id} className="overflow-hidden rounded-2xl">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-neutral-900">{file.display_name}</p>
                        <p className="text-xs text-neutral-500">
                          {DIGITAL_PRODUCT_FILE_TYPE_LABELS[file.file_type]}
                        </p>
                      </div>
                      <Lock className="h-4 w-4 shrink-0 text-neutral-400" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {videos.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-neutral-900">Tutorial videos</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {videos.map((video) => (
                  <Card key={video.id} className="overflow-hidden rounded-2xl">
                    <div className="relative aspect-video bg-neutral-100">
                      <div className="flex h-full items-center justify-center text-neutral-400">
                        <Video className="h-10 w-10" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                        <div className="rounded-full bg-white/90 p-3">
                          <Play className="h-6 w-6 fill-current text-neutral-900" />
                        </div>
                      </div>
                      <div className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5">
                        <Lock className="h-3.5 w-3.5 text-white" />
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="font-medium text-neutral-900">{video.title}</p>
                      <p className="text-xs text-neutral-500">Unlock after purchase</p>
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

export default PublicDigitalProductDetailPage;
