import DOMPurify from 'dompurify';
import { BookOpen, Edit, FolderOpen, Lock, Trash2 } from 'lucide-react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { SeriesBuyActions } from '@/features/series/components/SeriesBuyActions';
import SeriesPriceBadge from '@/features/series/components/SeriesPriceBadge';
import SeriesPurchasedBadge from '@/features/series/components/SeriesPurchasedBadge';
import { isSeriesPurchasable } from '@/features/series/utils/seriesPricing';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import type { Series } from '../types';

interface SeriesCardProps {
  series: Series;
  onEdit?: (seriesId: string) => void;
  onDelete?: (seriesId: string) => void;
  onSalesToggle?: (seriesId: string, salesEnabled: boolean) => void;
  isSalesTogglePending?: boolean;
  canManage?: boolean;
  canDelete?: boolean;
  basePath?: string;
}

const SeriesCard: React.FC<SeriesCardProps> = ({
  series,
  onEdit,
  onDelete,
  onSalesToggle,
  isSalesTogglePending = false,
  canManage = false,
  canDelete = false,
  basePath = '/dashboard/library/series',
}) => {
  const navigate = useNavigate();
  const isPremium = series.is_premium ?? false;
  const showBuyActions =
    !canManage && isSeriesPurchasable(series) && !series.has_purchased;

  const sanitizeConfig = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
    ALLOWED_ATTR: [],
  };

  const getSanitizedDescription = (description: string | null) => {
    if (!description) return '';
    const hasHtml = /<[^>]*>/.test(description);
    if (hasHtml) {
      const sanitized = DOMPurify.sanitize(description, sanitizeConfig);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitized;
      return tempDiv.textContent || tempDiv.innerText || '';
    }
    return description;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    navigate(`${basePath}/${series.id}`);
  };

  return (
    <Card
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1"
      onClick={handleCardClick}
    >
      {/* Thumbnail Section */}
      <div className="relative aspect-[300/160] bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
        {series.image_url ? (
          <img
            src={series.image_url}
            alt={series.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/80 backdrop-blur">
              <FolderOpen className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
        )}

        {/* Badges Container */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/90 backdrop-blur-sm text-white">
            <FolderOpen className="h-3 w-3" />
            Series
          </span>
          {!series.is_published && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-500/90 text-white">
              Draft
            </span>
          )}
        </div>

        {(isPremium || canManage || canDelete) && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {isPremium && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <Lock className="h-3 w-3" />
                Premium
              </span>
            )}
            {canManage && onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/90 text-neutral-700 shadow-md transition-all duration-300 hover:bg-white hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(series.id);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/90 text-red-600 shadow-md transition-all duration-300 hover:bg-white hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(series.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <CardHeader className="space-y-3 pb-4">
          <CardTitle className="text-lg font-semibold text-neutral-900 line-clamp-2">
            {series.title}
          </CardTitle>
          <CardDescription className="line-clamp-2 text-sm text-neutral-600">
            {getSanitizedDescription(series.description)}
          </CardDescription>
        </CardHeader>

        <CardContent className="mt-auto border-t border-neutral-200/60 pt-4">
          <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                {series.asset_count} {series.asset_count === 1 ? 'item' : 'items'}
              </span>
              {series.has_purchased && <SeriesPurchasedBadge />}
              <SeriesPriceBadge series={series} isStaff={canManage} />
            </div>
            {canManage && onSalesToggle && (
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <span className="text-[11px] font-medium text-neutral-600">Sales</span>
                <Switch
                  checked={series.sales_enabled}
                  disabled={isSalesTogglePending}
                  onCheckedChange={(checked) => onSalesToggle(series.id, checked)}
                  aria-label={`Toggle sales for ${series.title}`}
                />
              </div>
            )}
          </div>
          {showBuyActions && (
            <div
              className="mt-4 border-t border-neutral-200/60 pt-4"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <SeriesBuyActions series={series} layout="stack" />
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
};

export default SeriesCard;
