
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, FileText, Video, Youtube } from 'lucide-react';
import VideoEmbed from '@/components/VideoEmbed';

interface LibraryItem {
  id: string | number; // Allow both string and number for compatibility
  title: string;
  description: string;
  type: string;
  videoUrl?: string;
  createdAt: string;
}

interface LibraryItemCardProps {
  item: LibraryItem;
  onEdit: (itemId: string | number) => void;
  onDelete: (itemId: string | number) => void;
}

const LibraryItemCard: React.FC<LibraryItemCardProps> = ({ item, onEdit, onDelete }) => {
  const getVideoIcon = (type: string, videoUrl?: string) => {
    if (type !== 'Video') return <FileText className="w-5 h-5 text-red-600" />;
    
    if (videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be')) {
      return <Youtube className="w-5 h-5 text-red-600" />;
    }
    return <Video className="w-5 h-5 text-blue-600" />;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getVideoIcon(item.type, item.videoUrl)}
            <span className="text-sm font-medium text-gray-500">{item.type}</span>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(item.id)}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <CardTitle className="text-lg">{item.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm line-clamp-3 mb-3">
          {item.description}
        </CardDescription>
        
        {/* Embedded Video Preview */}
        {item.type === 'Video' && item.videoUrl && (
          <div className="mb-3">
            <VideoEmbed url={item.videoUrl} />
          </div>
        )}
        
        <p className="text-xs text-gray-400">
          Added on {new Date(item.createdAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
};

export default LibraryItemCard;
