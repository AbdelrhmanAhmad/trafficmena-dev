
import React from 'react';
import LibraryItemCard from '@/components/LibraryItemCard';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';

interface LibraryItem {
  id: string | number; // Allow both string and number for compatibility
  title: string;
  description: string;
  type: string;
  videoUrl?: string;
  createdAt: string;
}

interface LibraryGridProps {
  items: LibraryItem[];
  onEdit: (itemId: string | number) => void;
  onDelete: (itemId: string | number) => void;
  onAddNew: () => void;
}

const LibraryGrid: React.FC<LibraryGridProps> = ({ items, onEdit, onDelete, onAddNew }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No library items yet</h3>
        <p className="text-gray-600 mb-4">
          Start building your library by adding videos and documents from past meetups.
        </p>
        <Button onClick={onAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Your First Item
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <LibraryItemCard
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default LibraryGrid;
