import { FolderPlus } from 'lucide-react';
import React from 'react';
import { Button } from '@/shared/components/ui/button';
import type { Series } from '../types';
import SeriesCard from './SeriesCard';

interface SeriesGridProps {
  series: Series[];
  onEdit?: (seriesId: string) => void;
  onDelete?: (seriesId: string) => void;
  onSalesToggle?: (seriesId: string, salesEnabled: boolean) => void;
  isSalesTogglePending?: boolean;
  onAddNew?: () => void;
  canManage?: boolean;
  canDelete?: boolean;
  basePath?: string;
}

const SeriesGrid: React.FC<SeriesGridProps> = React.memo(
  ({
    series,
    onEdit,
    onDelete,
    onSalesToggle,
    isSalesTogglePending = false,
    onAddNew,
    canManage = false,
    canDelete = false,
    basePath,
  }) => {
    if (series.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
            <FolderPlus className="h-8 w-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">No series yet</h3>
          <p className="mt-2 max-w-sm text-sm text-neutral-600">
            Create content series to organize related resources together. Members can browse series
            to find curated learning content.
          </p>
          {onAddNew && canManage && (
            <Button onClick={onAddNew} className="mt-6">
              <FolderPlus className="mr-2 h-4 w-4" />
              Create series
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {series.map((item) => (
          <SeriesCard
            key={item.id}
            series={item}
            onEdit={onEdit}
            onDelete={onDelete}
            onSalesToggle={onSalesToggle}
            isSalesTogglePending={isSalesTogglePending}
            canManage={canManage}
            canDelete={canDelete}
            basePath={basePath}
          />
        ))}
      </div>
    );
  },
);

SeriesGrid.displayName = 'SeriesGrid';

export default SeriesGrid;
