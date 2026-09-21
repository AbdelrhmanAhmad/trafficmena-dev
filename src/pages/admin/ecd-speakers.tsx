import { Mic2, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEcdSpeaker,
  deleteEcdSpeaker,
  fetchEcdSpeakers,
  updateEcdSpeaker,
  type EcdSpeaker,
} from '@/app/api/ecd';
import { uploadFile } from '@/app/api/uploads';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
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

const ROOMS = [
  { index: 0, name: 'Main Stage' },
  { index: 1, name: 'Second Stage' },
  { index: 2, name: 'Acquisition workshops' },
  { index: 3, name: 'CRO & Retention workshops' },
  { index: 4, name: 'Operations & Logistics workshops' },
];

const TYPES = ['Founder', 'Operator', 'Executive', 'Specialist'] as const;

type FormState = {
  name: string;
  role: string;
  company: string;
  photoUrl: string;
  roomIndex: number;
  speakerType: string;
  statusTag: string;
  expertise: string;
  sessionTitle: string;
  sessionLabel: string;
  proof: string;
  featured: boolean;
  featuredSortOrder: number;
  sortOrder: number;
  published: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  role: '',
  company: '',
  photoUrl: '',
  roomIndex: 0,
  speakerType: 'Specialist',
  statusTag: 'Confirmed',
  expertise: '',
  sessionTitle: '',
  sessionLabel: '',
  proof: '',
  featured: false,
  featuredSortOrder: 0,
  sortOrder: 0,
  published: true,
});

function toPayload(form: FormState) {
  return {
    name: form.name.trim(),
    role: form.role.trim() || null,
    company: form.company.trim() || null,
    photoUrl: form.photoUrl.trim() || null,
    roomIndex: form.roomIndex,
    speakerType: (TYPES as readonly string[]).includes(form.speakerType)
      ? (form.speakerType as 'Founder' | 'Operator' | 'Executive' | 'Specialist')
      : null,
    statusTag: form.statusTag.trim() || 'Confirmed',
    expertise: form.expertise
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    sessionTitle: form.sessionTitle.trim() || null,
    sessionLabel: form.sessionLabel.trim() || null,
    proof: form.proof.trim() || null,
    featured: form.featured,
    featuredSortOrder: form.featuredSortOrder,
    sortOrder: form.sortOrder,
    published: form.published,
  };
}

function SpeakerFormDialog({
  open,
  onOpenChange,
  initial,
  speakerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: FormState;
  speakerId: string | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      if (speakerId) return updateEcdSpeaker(speakerId, payload);
      return createEcdSpeaker(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ecd-speakers'] });
      toast({ title: speakerId ? 'Speaker updated' : 'Speaker created' });
      onOpenChange(false);
    },
    onError: () => toast({ title: 'Save failed', variant: 'destructive' }),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await uploadFile({ file, scope: 'ecd' });
      setForm((f) => ({ ...f, photoUrl: url }));
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{speakerId ? 'Edit speaker' : 'Add speaker'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Job title</Label>
              <Input
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Company</Label>
              <Input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Photo URL</Label>
            <div className="flex gap-2">
              <Input
                value={form.photoUrl}
                onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                aria-label="Upload photo"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Room</Label>
              <Select
                value={String(form.roomIndex)}
                onValueChange={(v) => setForm((f) => ({ ...f, roomIndex: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOMS.map((r) => (
                    <SelectItem key={r.index} value={String(r.index)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={form.speakerType}
                onValueChange={(v) => setForm((f) => ({ ...f, speakerType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Status tag</Label>
              <Input
                value={form.statusTag}
                onChange={(e) => setForm((f) => ({ ...f, statusTag: e.target.value }))}
                placeholder="Confirmed / Proposed"
              />
            </div>
            <div className="space-y-1">
              <Label>Expertise (comma-separated)</Label>
              <Input
                value={form.expertise}
                onChange={(e) => setForm((f) => ({ ...f, expertise: e.target.value }))}
                placeholder="SEO, AI, Acquisition"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Session title</Label>
            <Input
              value={form.sessionTitle}
              onChange={(e) => setForm((f) => ({ ...f, sessionTitle: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Session label</Label>
            <Input
              value={form.sessionLabel}
              onChange={(e) => setForm((f) => ({ ...f, sessionLabel: e.target.value }))}
              placeholder="Workshop — Acquisition Room"
            />
          </div>
          <div className="space-y-1">
            <Label>Proof (featured)</Label>
            <Textarea
              value={form.proof}
              onChange={(e) => setForm((f) => ({ ...f, proof: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="ecd-spk-feat"
                checked={form.featured}
                onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))}
              />
              <Label htmlFor="ecd-spk-feat">Featured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="ecd-spk-pub"
                checked={form.published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
              />
              <Label htmlFor="ecd-spk-pub">Published</Label>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Featured sort</Label>
              <Input
                type="number"
                value={form.featuredSortOrder}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    featuredSortOrder: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Grid sort</Label>
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
          <Button
            type="button"
            className="w-full"
            disabled={!form.name.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const EcdSpeakersPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EcdSpeaker | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin', 'ecd-speakers'],
    queryFn: fetchEcdSpeakers,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEcdSpeaker,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ecd-speakers'] });
      toast({ title: 'Speaker deleted' });
    },
    onError: () => toast({ title: 'Delete failed', variant: 'destructive' }),
  });

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900">
                <Mic2 className="h-6 w-6" />
                ECD Speakers
              </h1>
              <p className="text-sm text-neutral-600">
                Featured band + Room/Type filters on speakers.html and home carousel.
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
              Add speaker
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-neutral-500">
                No speakers yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <Card key={s.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    <div className="flex flex-wrap gap-1">
                      {s.featured ? <Badge>Featured</Badge> : null}
                      <Badge variant={s.published ? 'default' : 'secondary'}>
                        {s.published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-neutral-600">
                    <div>{[s.role, s.company].filter(Boolean).join(' · ') || '—'}</div>
                    <div className="text-xs">
                      Room: {ROOMS.find((r) => r.index === s.roomIndex)?.name ?? s.roomIndex}
                      {s.speakerType ? ` · ${s.speakerType}` : ''}
                      {s.statusTag ? ` · ${s.statusTag}` : ''}
                    </div>
                    {s.sessionTitle ? (
                      <div className="text-xs text-neutral-500">{s.sessionTitle}</div>
                    ) : null}
                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(s);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => {
                          if (window.confirm(`Delete ${s.name}?`)) {
                            deleteMutation.mutate(s.id);
                          }
                        }}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <SpeakerFormDialog
            key={editing?.id ?? 'new'}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            speakerId={editing?.id ?? null}
            initial={
              editing
                ? {
                    name: editing.name,
                    role: editing.role || '',
                    company: editing.company || '',
                    photoUrl: editing.photoUrl || '',
                    roomIndex: editing.roomIndex ?? 0,
                    speakerType: editing.speakerType || 'Specialist',
                    statusTag: editing.statusTag || 'Confirmed',
                    expertise: (editing.expertise || []).join(', '),
                    sessionTitle: editing.sessionTitle || '',
                    sessionLabel: editing.sessionLabel || '',
                    proof: editing.proof || '',
                    featured: editing.featured,
                    featuredSortOrder: editing.featuredSortOrder ?? 0,
                    sortOrder: editing.sortOrder,
                    published: editing.published,
                  }
                : emptyForm()
            }
          />
        </div>
      </AppLayout>
    </AdminProtectedRoute>
  );
};

export default EcdSpeakersPage;
