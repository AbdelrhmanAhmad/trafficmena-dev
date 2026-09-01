import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fetchExpertsAdmin, type ExpertAdminRecord } from '@/app/api/experts';
import { filterExpertsBySearch, toggleExpertSelection } from '@/features/events/utils/eventExpertIds';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

type EventExpertPickerProps = {
  selectedExpertIds: string[];
  onChange: (expertIds: string[]) => void;
};

function expertStatusBadge(expert: ExpertAdminRecord) {
  if (expert.archivedAt) return <Badge variant="secondary">Archived</Badge>;
  if (expert.isPublished) return <Badge className="bg-[#29cf9f]">Published</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

export function EventExpertPicker({ selectedExpertIds, onChange }: EventExpertPickerProps) {
  const [experts, setExperts] = useState<ExpertAdminRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await fetchExpertsAdmin();
        if (!cancelled) setExperts(items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load experts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => filterExpertsBySearch(experts, search), [experts, search]);

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 p-4">
      <div>
        <Label>Experts / Speakers</Label>
        <p className="text-sm text-neutral-600">
          Search and select existing expert profiles. Create new experts from Admin → Expert Profiles.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          className="pl-9"
          placeholder="Search by name or headline…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {loading ? <p className="text-sm text-neutral-500">Loading experts…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && !error && filtered.length === 0 ? (
        <p className="text-sm text-neutral-500">No experts match your search.</p>
      ) : null}

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {filtered.map((expert) => {
          const checked = selectedExpertIds.includes(expert.id);
          const checkboxId = `event-expert-${expert.id}`;
          return (
            <label
              key={expert.id}
              htmlFor={checkboxId}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-neutral-100 p-3 hover:bg-neutral-50"
            >
              <Checkbox
                id={checkboxId}
                checked={checked}
                onCheckedChange={(value) =>
                  onChange(toggleExpertSelection(selectedExpertIds, expert.id, value === true))
                }
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-neutral-900">{expert.displayNameEn}</span>
                  {expertStatusBadge(expert)}
                </div>
                {expert.headlineEn ? (
                  <p className="text-sm text-neutral-600">{expert.headlineEn}</p>
                ) : null}
                {expert.displayNameAr && expert.displayNameAr !== expert.displayNameEn ? (
                  <p className="text-sm text-neutral-500" dir="rtl" lang="ar">
                    {expert.displayNameAr}
                  </p>
                ) : null}
              </div>
            </label>
          );
        })}
      </div>

      {selectedExpertIds.length > 0 ? (
        <p className="text-xs text-neutral-500">{selectedExpertIds.length} expert(s) selected</p>
      ) : null}
    </div>
  );
}
