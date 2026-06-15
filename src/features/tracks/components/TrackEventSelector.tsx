import { Calendar, Check, Search } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useEvents } from '@/features/events/hooks/useEvents';
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

interface TrackEventSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingEventIds: string[];
  onSelect: (eventIds: string[]) => void;
  isLoading?: boolean;
}

const TrackEventSelector: React.FC<TrackEventSelectorProps> = ({
  open,
  onOpenChange,
  existingEventIds,
  onSelect,
  isLoading = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch events (max 50 per API limit)
  const { data: eventsData, isLoading: eventsLoading } = useEvents(1, 50, {});

  const availableEvents = useMemo(() => {
    const events = eventsData?.items ?? [];
    const existingSet = new Set(existingEventIds);
    return events.filter((e) => !existingSet.has(e.id));
  }, [eventsData?.items, existingEventIds]);

  const filteredEvents = useMemo(() => {
    if (!search.trim()) return availableEvents;
    const lower = search.toLowerCase();
    return availableEvents.filter((e) => e.title.toLowerCase().includes(lower));
  }, [availableEvents, search]);

  const toggleEvent = (eventId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
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
          <DialogTitle>Add Events to Track</DialogTitle>
          <DialogDescription>
            Select events to include in this learning track. Only events not already in the track
            are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px] rounded-md border p-2">
            {eventsLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading events...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <Calendar className="mb-2 h-8 w-8" />
                <p>No available events found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredEvents.map((event) => {
                  const isSelected = selectedIds.has(event.id);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => toggleEvent(event.id)}
                      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 border border-emerald-200'
                          : 'hover:bg-neutral-50 border border-transparent'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-neutral-300'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.date).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {selectedIds.size > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} event{selectedIds.size > 1 ? 's' : ''} selected
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
              : `Add ${selectedIds.size || ''} Event${selectedIds.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TrackEventSelector;
