import { FileText, Plus } from 'lucide-react';
import React from 'react';
import { Button } from '@/shared/components/ui/button';
import LibraryItemCard from './LibraryItemCard';

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
  event_id?: string | null;
  is_public?: boolean;
  is_premium?: boolean;
  has_access?: boolean;
}

interface LibraryGridProps {
  items: LibraryItem[];
  onEdit: (itemId: string | number) => void;
  onDelete?: (itemId: string | number) => void;
  onAddNew: () => void;
  canManage?: boolean;
  canDelete?: boolean;
}

const LibraryGrid: React.FC<LibraryGridProps> = ({
  items,
  onEdit,
  onDelete,
  onAddNew,
  canManage = false,
  canDelete = false,
}) => {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-medium text-gray-900">No library items yet</h3>
        <p className="mb-4 text-gray-600">
          Start building your library by adding videos and documents from past meetups.
        </p>
        <Button onClick={onAddNew} disabled={!canManage}>
          <Plus className="mr-2 h-4 w-4" />
          Add Your First Item
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <LibraryItemCard
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          canManage={canManage}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
};

export default React.memo(LibraryGrid);
