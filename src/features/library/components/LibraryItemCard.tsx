import DOMPurify from 'dompurify';
import {
  Edit,
  FileText,
  Globe,
  Lock,
  Play,
  Presentation,
  Trash2,
  Video,
  Youtube,
} from 'lucide-react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

interface LibraryItem {
  id: string | number;
  title: string;
  description: string;
  file_type: string;
  video_url?: string | null;
  document_url?: string | null;
  embed_url?: string | null;
  embed_type?: string | null;
  file_url?: string | null;
  created_at: string;
  view_count?: number | null;
  download_count?: number | null;
  event_id?: string | null;
  is_public?: boolean;
  is_premium?: boolean;
  has_access?: boolean;
}

interface LibraryItemCardProps {
  item: LibraryItem;
  onEdit?: (itemId: string | number) => void;
  onDelete?: (itemId: string | number) => void;
  canManage?: boolean;
  canDelete?: boolean;
}

const LibraryItemCard: React.FC<LibraryItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  canManage = false,
  canDelete = false,
}) => {
  const navigate = useNavigate();
  const isPremium = item.is_premium ?? false;
  const hasAccess = item.has_access !== false;
  const showPremiumOverlay = !canManage && isPremium && !hasAccess;
  const showRegistrationOverlay = !showPremiumOverlay && !hasAccess;
  const getIcon = (fileType: string, videoUrl?: string | null, embedType?: string | null) => {
    if (fileType === 'Presentation' || embedType) {
      return <Presentation className="h-5 w-5 text-purple-600" />;
    }

    if (fileType === 'Video') {
      if (videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be')) {
        return <Youtube className="h-5 w-5 text-red-600" />;
      }
      return <Video className="h-5 w-5 text-blue-600" />;
    }

    return <FileText className="h-5 w-5 text-gray-600" />;
  };

  const sanitizeConfig = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
    ALLOWED_ATTR: [],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  };

  const getSanitizedDescription = (description: string) => {
    if (!description) return '';
    // Check if description contains HTML tags
    const hasHtml = /<[^>]*>/.test(description);

    if (hasHtml) {
      // First sanitize HTML
      const sanitized = DOMPurify.sanitize(description, sanitizeConfig);
      // Then strip HTML tags for card preview
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitized;
      return tempDiv.textContent || tempDiv.innerText || '';
    }

    // If no HTML, return as is
    return description;
  };

  const getThumbnailUrl = (_fileType: string, videoUrl?: string | null) => {
    // For YouTube videos, extract thumbnail
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) {
      const videoId = videoUrl.match(
        /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/,
      )?.[1];
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }

    // Return placeholder based on type
    return null;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on admin buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    // Navigate based on context - admin stays in admin, users stay in dashboard
    const basePath = canManage ? '/admin/library' : '/dashboard/library';
    navigate(`${basePath}/${item.id}`);
  };

  // Use correct field names and handle legacy data
  const videoUrl = item.video_url || item.file_url;
  const thumbnailUrl = getThumbnailUrl(item.file_type, videoUrl);

  return (
    <Card
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1"
      onClick={handleCardClick}
    >
      {/* Thumbnail Section */}
      <div className="relative aspect-[300/160] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            decoding="async"
            onError={(e) => {
              // Hide image on error and show placeholder
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f4fff9]/20 to-[#d5ffe9]/10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/80 backdrop-blur">
              {getIcon(item.file_type, videoUrl, item.embed_type)}
            </div>
          </div>
        )}

        {/* Play Overlay for Videos (only if has access) */}
        {(item.file_type === 'Video' || videoUrl) && item.has_access !== false && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/90 rounded-full p-3">
              <Play className="h-8 w-8 text-gray-900 fill-current" />
            </div>
          </div>
        )}

        {/* Premium overlay for restricted premium content */}
        {showPremiumOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/10">
            <div className="flex flex-col items-center gap-2 text-neutral-900/60">
              <Lock className="h-12 w-12" />
              <span className="text-lg font-semibold">Premium</span>
            </div>
          </div>
        )}

        {/* Lock Overlay for restricted content */}
        {showRegistrationOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
            <div className="text-center text-white">
              <Lock className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Register to access</p>
            </div>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm text-neutral-700 border border-white/50">
            {item.embed_type ? 'Presentation' : item.file_type}
          </span>
          {/* Public Badge for event-linked assets that are made public */}
          {item.event_id && item.is_public && (
            <Badge
              variant="secondary"
              className="bg-emerald-100/90 text-emerald-700 backdrop-blur-sm border-emerald-200/50"
            >
              <Globe className="h-3 w-3 mr-1" />
              Public
            </Badge>
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
                  onEdit(item.id);
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
                  onDelete(item.id);
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
            {item.title}
          </CardTitle>
          <CardDescription className="line-clamp-3 text-sm text-neutral-600">
            {getSanitizedDescription(item.description)}
          </CardDescription>
        </CardHeader>

        <CardContent className="mt-auto border-t border-neutral-200/60 pt-4 min-h-[80px]">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Added {new Date(item.created_at).toLocaleDateString()}</span>
          </div>

          {canManage && ((item.view_count ?? 0) > 0 || (item.download_count ?? 0) > 0) && (
            <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
              {(item.view_count ?? 0) > 0 && (
                <span>
                  <strong className="text-neutral-700">{item.view_count}</strong> views
                </span>
              )}
              {(item.download_count ?? 0) > 0 && (
                <span>
                  <strong className="text-neutral-700">{item.download_count}</strong> downloads
                </span>
              )}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
};

export default LibraryItemCard;
