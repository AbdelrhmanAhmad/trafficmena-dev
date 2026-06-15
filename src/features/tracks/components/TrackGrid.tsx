import { FolderPlus } from 'lucide-react';
import React from 'react';
import { Button } from '@/shared/components/ui/button';
import type { Track } from '../types';
import TrackCard from './TrackCard';

interface TrackGridProps {
  tracks: Track[];
  onEdit?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
  onAddNew?: () => void;
  canManage?: boolean;
  canDelete?: boolean;
  basePath?: string;
}

const TrackGrid: React.FC<TrackGridProps> = React.memo(
  ({ tracks, onEdit, onDelete, onAddNew, canManage = false, canDelete = false, basePath }) => {
    if (tracks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <FolderPlus className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">No tracks yet</h3>
          <p className="mt-2 max-w-sm text-sm text-neutral-600">
            Create learning tracks to group related events together. Members can follow tracks to
            progress through content systematically.
          </p>
          {onAddNew && canManage && (
            <Button onClick={onAddNew} className="mt-6">
              <FolderPlus className="mr-2 h-4 w-4" />
              Create track
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tracks.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            onEdit={onEdit}
            onDelete={onDelete}
            canManage={canManage}
            canDelete={canDelete}
            basePath={basePath}
          />
        ))}
      </div>
    );
  },
);

TrackGrid.displayName = 'TrackGrid';

export default TrackGrid;
