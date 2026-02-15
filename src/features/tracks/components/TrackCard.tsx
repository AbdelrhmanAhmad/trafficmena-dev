import DOMPurify from 'dompurify';
import { Calendar, Edit, FolderOpen, Trash2 } from 'lucide-react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import type { Track } from '../types';

interface TrackCardProps {
  track: Track;
  onEdit?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
  canManage?: boolean;
  canDelete?: boolean;
  basePath?: string;
}

const TrackCard: React.FC<TrackCardProps> = ({
  track,
  onEdit,
  onDelete,
  canManage = false,
  canDelete = false,
  basePath = '/dashboard/library/tracks',
}) => {
  const navigate = useNavigate();

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
    navigate(`${basePath}/${track.id}`);
  };

  return (
    <Card
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1"
      onClick={handleCardClick}
    >
      {/* Thumbnail Section */}
      <div className="relative aspect-[300/160] bg-gradient-to-br from-emerald-50 to-teal-100 overflow-hidden">
        {track.image_url ? (
          <img
            src={track.image_url}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/80 backdrop-blur">
              <FolderOpen className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
        )}

        {(canManage || canDelete) && (
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            {canManage && onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/90 text-neutral-700 shadow-md transition-all duration-300 hover:bg-white hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(track.id);
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
                  onDelete(track.id);
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
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/90 text-white">
              <FolderOpen className="h-3 w-3" />
              Track
            </span>
            {!track.is_published && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-500/90 text-white">
                Draft
              </span>
            )}
          </div>
          <CardTitle className="text-lg font-semibold text-neutral-900 line-clamp-2">
            {track.title}
          </CardTitle>
          <CardDescription className="line-clamp-2 text-sm text-neutral-600">
            {getSanitizedDescription(track.description)}
          </CardDescription>
        </CardHeader>

        <CardContent className="mt-auto border-t border-neutral-200/60 pt-4">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {track.event_count} {track.event_count === 1 ? 'event' : 'events'}
              </span>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export default TrackCard;
