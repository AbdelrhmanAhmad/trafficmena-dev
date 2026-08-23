import { Check, FileText, Presentation, Search, Video } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useLibraryAssets } from '@/features/library/hooks/useLibrary';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { ScrollArea } from '@/shared/components/ui/scroll-area';

interface SeriesAssetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingAssetIds: string[];
  onSelect: (assetIds: string[]) => void;
  isLoading?: boolean;
}

const getFileTypeIcon = (fileType: string) => {
  switch (fileType) {
    case 'Video':
      return <Video className="h-4 w-4" />;
    case 'Presentation':
      return <Presentation className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getFileTypeBadgeColor = (fileType: string) => {
  switch (fileType) {
    case 'Video':
      return 'bg-red-100 text-red-700';
    case 'Presentation':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
};

const SeriesAssetSelector: React.FC<SeriesAssetSelectorProps> = ({
  open,
  onOpenChange,
  existingAssetIds,
  onSelect,
  isLoading = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: assetsData, isLoading: assetsLoading } = useLibraryAssets(1, 50, {});

  const availableAssets = useMemo(() => {
    const assets = assetsData?.items ?? [];
    const existingSet = new Set(existingAssetIds);
    return assets.filter((a) => !existingSet.has(a.id));
  }, [assetsData?.items, existingAssetIds]);

  const filteredAssets = useMemo(() => {
    if (!search.trim()) return availableAssets;
    const lower = search.toLowerCase();
    return availableAssets.filter((a) => a.title.toLowerCase().includes(lower));
  }, [availableAssets, search]);

  const toggleAsset = (assetId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onSelect(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSearch('');
  };

  const handleCancel = () => {
    setSelectedIds(new Set());
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Assets to Series</DialogTitle>
          <DialogDescription>
            Select recording assets to include in this series. Only assets not already in the series
            are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px] rounded-md border p-2">
            {assetsLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading assets...
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <FileText className="mb-2 h-8 w-8" />
                <p>No available assets found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredAssets.map((asset) => {
                  const isSelected = selectedIds.has(asset.id);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => toggleAsset(asset.id)}
                      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 border border-indigo-200'
                          : 'hover:bg-neutral-50 border border-transparent'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          isSelected
                            ? 'bg-indigo-500 border-indigo-500 text-white'
                            : 'border-neutral-300'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{asset.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getFileTypeBadgeColor(asset.file_type)}`}
                          >
                            {getFileTypeIcon(asset.file_type)}
                            {asset.file_type}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {selectedIds.size > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} asset{selectedIds.size > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0 || isLoading}>
            {isLoading
              ? 'Adding...'
              : `Add ${selectedIds.size || ''} Asset${selectedIds.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SeriesAssetSelector;
