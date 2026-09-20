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
import { Switch } from '@/shared/components/ui/switch';
import { useToast } from '@/shared/hooks/custom/use-toast';

type FormState = {
  name: string;
  role: string;
  company: string;
  photoUrl: string;
  sortOrder: number;
  published: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  role: '',
  company: '',
  photoUrl: '',
  sortOrder: 0,
  published: true,
});

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
      const payload = {
        name: form.name.trim(),
        role: form.role.trim() || null,
        company: form.company.trim() || null,
        photoUrl: form.photoUrl.trim() || null,
        sortOrder: form.sortOrder,
        published: form.published,
      };
      if (speakerId) return updateEcdSpeaker(speakerId, payload);
      return createEcdSpeaker(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ecd-speakers'] });
      toast({ title: speakerId ? 'Speaker updated' : 'Speaker created' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Save failed', variant: 'destructive' });
    },
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{speakerId ? 'Edit speaker' : 'Add speaker'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ecd-speaker-name">Name</Label>
            <Input
              id="ecd-speaker-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ecd-speaker-role">Job title</Label>
            <Input
              id="ecd-speaker-role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ecd-speaker-company">Company</Label>
            <Input
              id="ecd-speaker-company"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ecd-speaker-photo">Photo URL</Label>
            <div className="flex gap-2">
              <Input
                id="ecd-speaker-photo"
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
            {form.photoUrl ? (
              <img
                src={form.photoUrl}
                alt=""
                className="mt-2 h-16 w-16 rounded-full object-cover"
              />
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ecd-speaker-sort">Sort order</Label>
            <Input
              id="ecd-speaker-sort"
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: Number.parseInt(e.target.value, 10) || 0 }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="ecd-speaker-pub">Published</Label>
            <Switch
              id="ecd-speaker-pub"
              checked={form.published}
              onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
            />
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
                Homepage speaker carousel for ECommerce Day.
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
                No speakers yet. Add confirmed speakers to populate the homepage carousel.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <Card key={s.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    <Badge variant={s.published ? 'default' : 'secondary'}>
                      {s.published ? 'Published' : 'Draft'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      {s.photoUrl ? (
                        <img
                          src={s.photoUrl}
                          alt=""
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-xs text-neutral-400">
                          —
                        </div>
                      )}
                      <div className="min-w-0 text-sm text-neutral-600">
                        {[s.role, s.company].filter(Boolean).join(', ') || '—'}
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500">Sort: {s.sortOrder}</div>
                    <div className="flex gap-2">
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
