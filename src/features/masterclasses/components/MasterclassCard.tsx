import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MasterclassStoreItem } from '@/app/api/masterclasses';
import { formatSeriesPriceLabel } from '@/features/series/utils/seriesPricing';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

type MasterclassCardProps = {
  masterclass: MasterclassStoreItem;
};

export function MasterclassCard({ masterclass }: MasterclassCardProps) {
  const href = masterclass.is_enrolled
    ? `/dashboard/masterclasses/${masterclass.id}/learn`
    : `/dashboard/masterclasses/${masterclass.id}`;

  return (
    <Link to={href} className="block">
      <Card className="h-full overflow-hidden rounded-2xl transition hover:shadow-md">
        {masterclass.image_url ? (
          <div className="aspect-video overflow-hidden bg-neutral-100">
            <img
              src={masterclass.image_url}
              alt={masterclass.title}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center bg-neutral-100">
            <GraduationCap className="h-12 w-12 text-neutral-300" />
          </div>
        )}
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            {masterclass.is_enrolled && (
              <Badge className="bg-[#29cf9f]">Enrolled</Badge>
            )}
            {!masterclass.is_enrolled && masterclass.is_sellable && (
              <Badge variant="outline">Available</Badge>
            )}
          </div>
          <CardTitle className="text-lg">{masterclass.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-600">
          <p>{masterclass.lesson_count} lessons</p>
          {masterclass.price_in_cents && masterclass.price_in_cents > 0 && !masterclass.is_enrolled && (
            <p className="mt-1 font-semibold text-neutral-900">
              {formatSeriesPriceLabel(masterclass.price_in_cents)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
