import { CheckCircle2, FileStack } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DigitalProductStoreItem } from '@/app/api/digitalProducts';
import { DigitalProductBuyActions, DigitalProductPrice } from './DigitalProductBuyActions';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';

type DigitalProductCardProps = {
  product: DigitalProductStoreItem;
};

export function DigitalProductCard({ product }: DigitalProductCardProps) {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl">
      {product.image_url ? (
        <div className="aspect-video w-full overflow-hidden bg-neutral-100">
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-cover"
          />
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
              مشتري
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 text-sm text-neutral-600">
        {product.description ? (
          <p className="line-clamp-3">{product.description}</p>
        ) : (
          <p className="text-neutral-400">منتج رقمي</p>
        )}
        <p className="mt-2 text-xs text-neutral-500">{product.file_count} ملف/ملفات</p>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3 border-t bg-neutral-50/50 pt-4">
        <DigitalProductPrice priceInCents={product.price_in_cents} />
        {product.is_purchased ? (
          <Link
            to={`/dashboard/digital-products/${product.id}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#29cf9f] px-4 text-sm font-medium text-white hover:bg-[#05ef62]"
          >
            عرض الملفات
          </Link>
        ) : (
          <DigitalProductBuyActions product={product} layout="stack" />
        )}
      </CardFooter>
    </Card>
  );
}
