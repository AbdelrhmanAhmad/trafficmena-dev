import DOMPurify from 'dompurify';
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

function DigitalProductDetailContent() {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useDigitalProductStoreDetail(id);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <p className="text-red-600">Product unavailable.</p>;

  const { product, files, videos } = data;
  const sanitizedDescription = product.description
    ? DOMPurify.sanitize(product.description)
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" asChild className="px-0">
        <Link to="/dashboard/digital-products">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to products
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
          {sanitizedDescription && (
            <SanitizedDescription
              className="prose prose-neutral mt-3 max-w-none text-neutral-600"
              html={sanitizedDescription}
            />
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {product.is_purchased && (
            <Badge className="gap-1 bg-[#29cf9f]">
              <CheckCircle2 className="h-3 w-3" />
              Purchased lifetime access
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
              <CardTitle>Files ({files.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <DigitalProductFileList files={files} />
            </CardContent>
          </Card>

          {videos.length > 0 && (
            <div className="space-y-4">
              {videos.map((video) => (
                <Card key={video.id} className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>{video.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VideoEmbed url={video.video_url} />
                  </CardContent>
                </Card>
              ))}
            </div>
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
