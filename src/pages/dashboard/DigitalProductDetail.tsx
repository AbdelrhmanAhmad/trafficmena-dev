import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  DigitalProductBuyActions,
  DigitalProductPrice,
} from '@/features/digital-products/components/DigitalProductBuyActions';
import { useDigitalProductStoreDetail } from '@/features/digital-products/hooks/useDigitalProducts';
import { DigitalProductFileList } from '@/pages/dashboard/DigitalProducts';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AppLayout from '@/shared/components/layout/AppLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import VideoEmbed from '@/shared/components/VideoEmbed';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { getSecureIframeAttributes, validateEmbedUrl } from '@/shared/utils/embedUrlValidation';

function renderEmbed(url: string, type?: string | null) {
  if (!validateEmbedUrl(url)) {
    return <p className="text-sm text-red-600">Invalid embed URL.</p>;
  }
  const iframeProps = getSecureIframeAttributes(url);
  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-black">
      <iframe {...iframeProps} title={type ?? 'Tutorial video'} className="h-full w-full" />
    </div>
  );
}

function DigitalProductDetailContent() {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useDigitalProductStoreDetail(id);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <p className="text-red-600">المنتج غير متاح.</p>;

  const { product, files, video_asset: videoAsset } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" asChild className="px-0">
        <Link to="/dashboard/digital-products">
          <ArrowLeft className="mr-2 h-4 w-4" />
          العودة للمنتجات
        </Link>
      </Button>

      {product.image_url && (
        <div className="aspect-[21/9] overflow-hidden rounded-2xl bg-neutral-100">
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">{product.title}</h1>
          {product.description && (
            <p className="mt-3 text-neutral-600 whitespace-pre-wrap">{product.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {product.is_purchased && (
            <Badge className="gap-1 bg-[#29cf9f]">
              <CheckCircle2 className="h-3 w-3" />
              مشتري — وصول دائم
            </Badge>
          )}
          <DigitalProductPrice priceInCents={product.price_in_cents} />
        </div>
      </div>

      {!product.is_purchased && product.is_sellable && (
        <DigitalProductBuyActions product={product} layout="inline" />
      )}

      {product.is_purchased && (
        <>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>الملفات ({files.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <DigitalProductFileList files={files} />
            </CardContent>
          </Card>

          {videoAsset && (videoAsset.embed_url || videoAsset.video_url) && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>فيديو الشرح</CardTitle>
              </CardHeader>
              <CardContent>
                {videoAsset.video_url ? (
                  <VideoEmbed url={videoAsset.video_url} />
                ) : videoAsset.embed_url ? (
                  renderEmbed(videoAsset.embed_url, videoAsset.embed_type)
                ) : null}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function DigitalProductDetailPage() {
  return (
    <ProtectedRoute>
      <AppLayout variant="member">
        <DigitalProductDetailContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
