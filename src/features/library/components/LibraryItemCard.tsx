import DOMPurify from 'dompurify';
import { Edit, FileText, Play, Presentation, Trash2, Video, Youtube } from 'lucide-react';
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

interface LibraryItem {
  id: string | number; // Allow both string and number for compatibility
  title: string;
  description: string;
  file_type: string; // Match database field name
  video_url?: string | null; // Match database field name
  document_url?: string | null; // Match database field name
  embed_url?: string | null; // Match database field name
  embed_type?: string | null; // Match database field name
  file_url?: string | null; // Legacy field for backward compatibility
  created_at: string; // Match database field name
  view_count?: number | null;
  download_count?: number | null;
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
      className="group flex h-full cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-lg"
      onClick={handleCardClick}
    >
      {/* Thumbnail Section */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide image on error and show placeholder
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {getIcon(item.file_type, videoUrl, item.embed_type)}
          </div>
        )}

        {/* Play Overlay for Videos */}
        {(item.file_type === 'Video' || videoUrl) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/90 rounded-full p-3">
              <Play className="h-8 w-8 text-gray-900 fill-current" />
            </div>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-white/90 backdrop-blur-sm text-gray-700">
            {item.embed_type ? 'Presentation' : item.file_type}
          </span>
        </div>

        {(canManage || canDelete) && (
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            {canManage && onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/90 text-gray-700 shadow-sm transition-colors hover:bg-white"
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
                className="h-8 w-8 rounded-full bg-white/90 text-red-600 shadow-sm transition-colors hover:bg-white"
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
          <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
            {item.title}
          </CardTitle>
          <CardDescription className="line-clamp-3 text-sm text-gray-600">
            {getSanitizedDescription(item.description)}
          </CardDescription>
        </CardHeader>

        <CardContent className="mt-auto border-t pt-4 min-h-[80px]">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Added {new Date(item.created_at).toLocaleDateString()}</span>
          </div>

          {canManage && ((item.view_count ?? 0) > 0 || (item.download_count ?? 0) > 0) && (
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              {(item.view_count ?? 0) > 0 && (
                <span>
                  <strong className="text-gray-700">{item.view_count}</strong> views
                </span>
              )}
              {(item.download_count ?? 0) > 0 && (
                <span>
                  <strong className="text-gray-700">{item.download_count}</strong> downloads
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
