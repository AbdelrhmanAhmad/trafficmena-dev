import DOMPurify from 'dompurify';
import { CheckCircle2, FileStack, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DigitalProductStoreItem } from '@/app/api/digitalProducts';
import { DigitalProductBuyActions, DigitalProductPrice } from './DigitalProductBuyActions';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { getVideoThumbnailUrl } from '@/shared/utils/videoThumbnail';

type DigitalProductCardProps = {
  product: DigitalProductStoreItem;
};

function descriptionPreview(html: string | null | undefined): string {
  if (!html) return '';
  const sanitized = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  return sanitized.trim();
}

export function DigitalProductCard({ product }: DigitalProductCardProps) {
  const thumbnailUrl =
    product.image_url ?? getVideoThumbnailUrl(product.first_video_url) ?? null;
  const previewText = descriptionPreview(product.description);

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl">
      {thumbnailUrl ? (
        <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
          <img
            src={thumbnailUrl}
            alt={product.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {!product.image_url && product.first_video_url && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="rounded-full bg-white/90 p-2">
                <Play className="h-6 w-6 fill-current text-neutral-900" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center bg-neutral-100 text-neutral-400">
          <FileStack className="h-10 w-10" />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-snug">
            <Link
              to={`/dashboard/digital-products/${product.id}`}
              className="hover:text-[#29cf9f] hover:underline"
            >
              {product.title}
            </Link>
          </CardTitle>
          {product.is_purchased && (
            <Badge variant="secondary" className="shrink-0 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Purchased
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 text-sm text-neutral-600">
        {previewText ? (
          <p className="line-clamp-3">{previewText}</p>
        ) : (
          <p className="text-neutral-400">Digital product</p>
        )}
        <p className="mt-2 text-xs text-neutral-500">
          {product.file_count} {product.file_count === 1 ? 'file' : 'files'}
        </p>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3 border-t bg-neutral-50/50 pt-4">
        <DigitalProductPrice priceInCents={product.price_in_cents} />
        {product.is_purchased ? (
          <Link
            to={`/dashboard/digital-products/${product.id}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#29cf9f] px-4 text-sm font-medium text-white hover:bg-[#05ef62]"
          >
            View files
          </Link>
        ) : (
          <DigitalProductBuyActions product={product} layout="stack" />
        )}
      </CardFooter>
    </Card>
  );
}
