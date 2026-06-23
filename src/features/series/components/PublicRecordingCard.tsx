import { BookOpen, CheckCircle2, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SeriesRecord } from '@/app/api/series';
import SeriesPriceBadge from '@/features/series/components/SeriesPriceBadge';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { stripHtmlTags } from '@/shared/utils/inputSanitization';

type PublicRecordingCardProps = {
  series: SeriesRecord;
};

export function PublicRecordingCard({ series }: PublicRecordingCardProps) {
  const descriptionPreview = series.description
    ? stripHtmlTags(series.description).slice(0, 140)
    : '';

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[300/160] w-full overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-100">
        {series.image_url ? (
          <img
            src={series.image_url}
            alt={series.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-indigo-300">
            <FolderOpen className="h-12 w-12" />
          </div>
        )}
        {series.has_purchased && (
          <Badge className="absolute right-3 top-3 gap-1 bg-[#29cf9f] text-white hover:bg-[#29cf9f]">
            <CheckCircle2 className="h-3 w-3" />
            Purchased
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-500/90 px-2.5 py-0.5 text-[10px] font-semibold text-white">
            Recording
          </span>
          <SeriesPriceBadge series={series} />
        </div>

        <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-neutral-900">
          {series.title}
        </h3>

        {descriptionPreview ? (
          <p className="mt-2 line-clamp-3 flex-1 text-sm text-neutral-600">{descriptionPreview}</p>
        ) : (
          <p className="mt-2 flex-1 text-sm text-neutral-400">On-demand recording series.</p>
        )}

        <p className="mt-3 flex items-center gap-1 text-xs text-neutral-500">
          <BookOpen className="h-3.5 w-3.5" />
          {series.asset_count} {series.asset_count === 1 ? 'recording' : 'recordings'}
        </p>

        <Button
          asChild
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010] hover:brightness-95"
        >
          <Link to={`/recordings/${series.id}`}>View details</Link>
        </Button>
      </div>
    </article>
  );
}
