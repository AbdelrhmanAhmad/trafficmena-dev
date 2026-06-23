import { CheckCircle2, FileStack, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PublicDigitalProductItem } from '@/app/api/digitalProducts';
import { DigitalProductPrice } from './DigitalProductBuyActions';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { stripHtmlTags } from '@/shared/utils/inputSanitization';
import { getVideoThumbnailUrl } from '@/shared/utils/videoThumbnail';

type PublicDigitalProductCardProps = {
  product: PublicDigitalProductItem;
};

export function PublicDigitalProductCard({ product }: PublicDigitalProductCardProps) {
  const thumbnailUrl =
    product.image_url ?? getVideoThumbnailUrl(product.first_video_url) ?? null;
  const descriptionPreview = product.description
    ? stripHtmlTags(product.description).slice(0, 140)
    : '';

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[300/160] w-full overflow-hidden bg-neutral-100">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-300">
            <FileStack className="h-12 w-12" />
          </div>
        )}
        {!product.image_url && product.first_video_url && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15">
            <div className="rounded-full bg-white/90 p-2">
              <Play className="h-5 w-5 fill-current text-neutral-900" />
            </div>
          </div>
        )}
        {product.is_purchased && (
          <Badge className="absolute right-3 top-3 gap-1 bg-[#29cf9f] text-white hover:bg-[#29cf9f]">
            <CheckCircle2 className="h-3 w-3" />
            Purchased
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 inline-flex items-center gap-2">
          <span className="rounded-full bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-2.5 py-0.5 text-[10px] font-semibold text-[#101010]">
            Digital Product
          </span>
          <DigitalProductPrice priceInCents={product.price_in_cents} />
        </div>

        <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-neutral-900">
          {product.title}
        </h3>

        {descriptionPreview ? (
          <p className="mt-2 line-clamp-3 flex-1 text-sm text-neutral-600">{descriptionPreview}</p>
        ) : (
          <p className="mt-2 flex-1 text-sm text-neutral-400">One-time purchase digital product.</p>
        )}

        <p className="mt-3 text-xs text-neutral-500">
          {product.file_count} {product.file_count === 1 ? 'file' : 'files'} included
        </p>

        <Button
          asChild
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010] hover:brightness-95"
        >
          <Link to={`/digital-products/${product.id}`}>View details</Link>
        </Button>
      </div>
    </article>
  );
}
