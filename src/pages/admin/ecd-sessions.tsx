import { ArrowUpDown, CalendarDays, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEcdSession,
  deleteEcdSession,
  fetchEcdSessions,
  updateEcdSession,
  type EcdSession,
} from '@/app/api/ecd';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/custom/use-toast';

const TRACKS = [
  { index: 0, name: 'Main Stage', short: 'Main' },
  { index: 1, name: 'Second Stage', short: 'Second' },
  { index: 2, name: 'Acquisition (CLICKED) — FJ only', short: 'Acquisition' },
  { index: 3, name: 'CRO & Retention (CONFIRMED) — FJ only', short: 'CRO' },
  { index: 4, name: 'Operations & Logistics (DELIVERED) — FJ only', short: 'Ops' },
];

type SortKey = 'track_time' | 'time' | 'title' | 'slug' | 'sortOrder';
type AccessFilter = 'all' | 'fj' | 'open';
type PublishedFilter = 'all' | 'published' | 'draft';

function timeSortKey(t: string) {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 9999;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (h >= 1 && h <= 10) h += 12;
  return h * 60 + min;
}

function trackName(index: number) {
  return TRACKS.find((t) => t.index === index)?.short ?? `Track ${index}`;
}

type FormState = {
  slug: string;
  trackIndex: number;
  timeLabel: string;
  format: string;
  category: string;
  title: string;
  speakerLabel: string;
  topics: string;
  description: string;
  learn: string;
  output: string;
  tools: string;
  level: string;
  fullJourneyOnly: boolean;
  capacity: string;
  sortOrder: number;
  published: boolean;
};

const emptyForm = (): FormState => ({
  slug: '',
  trackIndex: 2,
  timeLabel: '12:30',
  format: 'Workshop',
  category: 'Workshops',
  title: '',
  speakerLabel: 'Speaker will be announced',
  topics: '',
  description: '',
  learn: '',
  output: '',
  tools: 'Laptop recommended',
  level: 'Intermediate',
  fullJourneyOnly: true,
  capacity: '',
  sortOrder: 0,
  published: true,
});

function fromSession(s: EcdSession): FormState {
  return {
    slug: s.slug,
    trackIndex: s.trackIndex,
    timeLabel: s.timeLabel,
    format: s.format || '',
    category: s.category || '',
    title: s.title,
    speakerLabel: s.speakerLabel || 'Speaker will be announced',
    topics: (s.topics || []).join(', '),
    description: s.description || '',
    learn: (s.learn || []).join('\n'),
    output: s.output || '',
    tools: s.tools || '',
    level: s.level || '',
    fullJourneyOnly: s.fullJourneyOnly,
    capacity: s.capacity == null ? '' : String(s.capacity),
    sortOrder: s.sortOrder,
    published: s.published,
  };
}

function toPayload(form: FormState) {
  const capacityTrim = form.capacity.trim();
  return {
    slug: form.slug.trim().toLowerCase(),
    trackIndex: form.trackIndex,
    timeLabel: form.timeLabel.trim(),
    format: form.format.trim() || null,
    category: form.category.trim() || null,
    title: form.title.trim(),
    speakerLabel: form.speakerLabel.trim() || null,
    topics: form.topics
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    description: form.description.trim() || null,
    learn: form.learn
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    output: form.output.trim() || null,
    tools: form.tools.trim() || null,
    level: form.level.trim() || null,
    fullJourneyOnly: form.fullJourneyOnly,
    capacity: capacityTrim === '' ? null : Number.parseInt(capacityTrim, 10) || null,
    sortOrder: form.sortOrder,
    published: form.published,
  };
}

function SessionFormDialog({
  open,
  onOpenChange,
  initial,
  sessionId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: FormState;
  sessionId: string | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      if (sessionId) return updateEcdSession(sessionId, payload);
      return createEcdSession(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ecd-sessions'] });
      toast({ title: sessionId ? 'Session updated' : 'Session created' });
      onOpenChange(false);
    },
    onError: () => toast({ title: 'Save failed', variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sessionId ? 'Edit session' : 'Add session'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="w1a"
                disabled={!!sessionId}
              />
            </div>
            <div className="space-y-1">
              <Label>Time</Label>
              <Input
                value={form.timeLabel}
                onChange={(e) => setForm((f) => ({ ...f, timeLabel: e.target.value }))}
                placeholder="12:30"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Track / room</Label>
            <Select
              value={String(form.trackIndex)}
              onValueChange={(v) => {
                const trackIndex = Number(v);
                setForm((f) => ({
                  ...f,
                  trackIndex,
                  fullJourneyOnly: trackIndex >= 2,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRACKS.map((t) => (
                  <SelectItem key={t.index} value={String(t.index)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Format</Label>
              <Input
                value={form.format}
                onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Speaker label</Label>
            <Input
              value={form.speakerLabel}
              onChange={(e) => setForm((f) => ({ ...f, speakerLabel: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Topics (comma-separated)</Label>
            <Input
              value={form.topics}
              onChange={(e) => setForm((f) => ({ ...f, topics: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label>Learn (one per line)</Label>
            <Textarea
              value={form.learn}
              onChange={(e) => setForm((f) => ({ ...f, learn: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Output</Label>
              <Input
                value={form.output}
                onChange={(e) => setForm((f) => ({ ...f, output: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Tools</Label>
              <Input
                value={form.tools}
                onChange={(e) => setForm((f) => ({ ...f, tools: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Level</Label>
              <Input
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Capacity (seats)</Label>
              <Input
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                placeholder="Empty = unlimited"
              />
              <p className="text-[11px] text-neutral-500">
                For FJ workshops: when reserved ≥ capacity, UI disables + API rejects. Leave empty
                for unlimited.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Sort</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sortOrder: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="ecd-sess-fj"
                checked={form.fullJourneyOnly}
                onCheckedChange={(v) => setForm((f) => ({ ...f, fullJourneyOnly: v }))}
              />
              <Label htmlFor="ecd-sess-fj">Full Journey only</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="ecd-sess-pub"
                checked={form.published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
              />
              <Label htmlFor="ecd-sess-pub">Published</Label>
            </div>
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={!form.slug.trim() || !form.title.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const EcdSessionsPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EcdSession | null>(null);

  const [q, setQ] = useState('');
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [accessFilter, setAccessFilter] = useState<AccessFilter>('all');
  const [publishedFilter, setPublishedFilter] = useState<PublishedFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('track_time');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin', 'ecd-sessions'],
    queryFn: fetchEcdSessions,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEcdSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ecd-sessions'] });
      toast({ title: 'Session deleted' });
    },
    onError: () => toast({ title: 'Delete failed', variant: 'destructive' }),
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = items.filter((s) => {
      if (trackFilter !== 'all' && s.trackIndex !== Number(trackFilter)) return false;
      if (accessFilter === 'fj' && !s.fullJourneyOnly) return false;
      if (accessFilter === 'open' && s.fullJourneyOnly) return false;
      if (publishedFilter === 'published' && !s.published) return false;
      if (publishedFilter === 'draft' && s.published) return false;
      if (!query) return true;
      const hay = [s.title, s.slug, s.format, s.category, s.speakerLabel, s.timeLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'track_time') {
        cmp = a.trackIndex - b.trackIndex || timeSortKey(a.timeLabel) - timeSortKey(b.timeLabel);
      } else if (sortKey === 'time') {
        cmp = timeSortKey(a.timeLabel) - timeSortKey(b.timeLabel);
      } else if (sortKey === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else if (sortKey === 'slug') {
        cmp = a.slug.localeCompare(b.slug);
      } else {
        cmp = a.sortOrder - b.sortOrder;
      }
      return cmp * dir;
    });
    return list;
  }, [items, q, trackFilter, accessFilter, publishedFilter, sortKey, sortDir]);

  const trackCounts = useMemo(() => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const s of items) {
      counts[s.trackIndex] = (counts[s.trackIndex] || 0) + 1;
    }
    return counts;
  }, [items]);

  const hasActiveFilters =
    q.trim() !== '' ||
    trackFilter !== 'all' ||
    accessFilter !== 'all' ||
    publishedFilter !== 'all' ||
    sortKey !== 'track_time' ||
    sortDir !== 'asc';

  const clearFilters = () => {
    setQ('');
    setTrackFilter('all');
    setAccessFilter('all');
    setPublishedFilter('all');
    setSortKey('track_time');
    setSortDir('asc');
  };

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900">
                <CalendarDays className="h-6 w-6" />
                ECD Agenda Sessions
              </h1>
              <p className="text-sm text-neutral-600">
                Main / Second stage + Full Journey workshop tracks.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add session
            </Button>
          </div>

          <Card>
            <CardContent className="space-y-3 pt-6">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1 space-y-1">
                  <Label htmlFor="ecd-sess-search">Search</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                    <Input
                      id="ecd-sess-search"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Title, slug, format…"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="w-[180px] space-y-1">
                  <Label>Track</Label>
                  <Select value={trackFilter} onValueChange={setTrackFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tracks ({items.length})</SelectItem>
                      {TRACKS.map((t) => (
                        <SelectItem key={t.index} value={String(t.index)}>
                          {t.short} ({trackCounts[t.index] || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[150px] space-y-1">
                  <Label>Access</Label>
                  <Select
                    value={accessFilter}
                    onValueChange={(v) => setAccessFilter(v as AccessFilter)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tickets</SelectItem>
                      <SelectItem value="fj">Full Journey only</SelectItem>
                      <SelectItem value="open">Main / Second</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[140px] space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={publishedFilter}
                    onValueChange={(v) => setPublishedFilter(v as PublishedFilter)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[170px] space-y-1">
                  <Label>Sort by</Label>
                  <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="track_time">Track → time</SelectItem>
                      <SelectItem value="time">Time of day</SelectItem>
                      <SelectItem value="title">Title A–Z</SelectItem>
                      <SelectItem value="slug">Slug</SelectItem>
                      <SelectItem value="sortOrder">Sort order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  aria-label={`Sort ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
                >
                  <ArrowUpDown className="mr-1 h-4 w-4" />
                  {sortDir === 'asc' ? 'Asc' : 'Desc'}
                </Button>
                {hasActiveFilters ? (
                  <Button type="button" variant="ghost" onClick={clearFilters}>
                    <X className="mr-1 h-4 w-4" />
                    Reset
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-neutral-500">
                Showing {filtered.length} of {items.length} sessions
              </p>
            </CardContent>
          </Card>

          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-neutral-500">
                No sessions yet. Run{' '}
                <code className="rounded bg-neutral-100 px-1">seed-ecd-sessions.mjs</code>.
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-neutral-500">
                No sessions match these filters.{' '}
                <button
                  type="button"
                  className="underline"
                  onClick={clearFilters}
                >
                  Reset
                </button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Time</th>
                    <th className="px-3 py-2 font-medium">Track</th>
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Format</th>
                    <th className="px-3 py-2 font-medium">Flags</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-neutral-100 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                        {s.timeLabel}
                        <div className="text-[10px] text-neutral-400">{s.slug}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">{trackName(s.trackIndex)}</td>
                      <td className="max-w-[280px] px-3 py-2">
                        <div className="line-clamp-2 font-medium text-neutral-900">{s.title}</div>
                        <div className="truncate text-xs text-neutral-500">
                          {s.speakerLabel || '—'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-600">
                        {s.format || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {s.fullJourneyOnly ? <Badge>FJ</Badge> : null}
                          <Badge variant={s.published ? 'default' : 'secondary'}>
                            {s.published ? 'Pub' : 'Draft'}
                          </Badge>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(s);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (window.confirm(`Delete ${s.slug}?`)) {
                                deleteMutation.mutate(s.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <SessionFormDialog
            key={editing?.id || 'new'}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            initial={editing ? fromSession(editing) : emptyForm()}
            sessionId={editing?.id ?? null}
          />
        </div>
      </AppLayout>
    </AdminProtectedRoute>
  );
};

export default EcdSessionsPage;
