import { Handshake, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEcdPartner,
  deleteEcdPartner,
  fetchEcdPartners,
  updateEcdPartner,
  type EcdPartner,
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

const TIERS = [
  { id: 'title', label: 'Top Player Partner' },
  { id: 'strategic', label: 'Strategic Partner' },
  { id: 'innovation', label: 'Innovation Partner' },
  { id: 'empowerment', label: 'Empowerment Partner' },
  { id: 'community', label: 'Community Partner' },
] as const;

type TierId = (typeof TIERS)[number]['id'];

type FormState = {
  name: string;
  logoUrl: string;
  websiteUrl: string;
  tier: TierId;
  blurb: string;
  supportedAsset: string;
  experienceUrl: string;
  featured: boolean;
  featuredSortOrder: number;
  showOnHome: boolean;
  sortOrder: number;
  published: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  logoUrl: '',
  websiteUrl: '',
  tier: 'community',
  blurb: '',
  supportedAsset: '',
  experienceUrl: '',
  featured: false,
  featuredSortOrder: 0,
  showOnHome: true,
  sortOrder: 0,
  published: true,
});

function tierLabel(id: string) {
  return TIERS.find((t) => t.id === id)?.label ?? id;
}

function PartnerFormDialog({
  open,
  onOpenChange,
  initial,
  partnerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: FormState;
  partnerId: string | null;
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
        logoUrl: form.logoUrl.trim() || null,
        websiteUrl: form.websiteUrl.trim() || null,
        tier: form.tier,
        blurb: form.blurb.trim() || null,
        supportedAsset: form.supportedAsset.trim() || null,
        experienceUrl: form.experienceUrl.trim() || null,
        featured: form.featured,
        featuredSortOrder: form.featuredSortOrder,
        showOnHome: form.showOnHome,
        sortOrder: form.sortOrder,
        published: form.published,
      };
      if (partnerId) return updateEcdPartner(partnerId, payload);
      return createEcdPartner(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ecd-partners'] });
      toast({ title: partnerId ? 'Sponsor updated' : 'Sponsor created' });
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
      setForm((f) => ({ ...f, logoUrl: url }));
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
          <DialogTitle>{partnerId ? 'Edit sponsor' : 'Add sponsor'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ecd-partner-name">Name</Label>
            <Input
              id="ecd-partner-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Tier</Label>
            <Select
              value={form.tier}
              onValueChange={(v) => setForm((f) => ({ ...f, tier: v as TierId }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ecd-partner-logo">Logo URL</Label>
            <div className="flex gap-2">
              <Input
                id="ecd-partner-logo"
                value={form.logoUrl}
                onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                aria-label="Upload logo"
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
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="" className="mt-2 h-12 object-contain" />
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ecd-partner-web">Website URL</Label>
            <Input
              id="ecd-partner-web"
              value={form.websiteUrl}
              onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ecd-partner-blurb">Featured blurb</Label>
            <Textarea
              id="ecd-partner-blurb"
              rows={2}
              value={form.blurb}
              onChange={(e) => setForm((f) => ({ ...f, blurb: e.target.value }))}
              placeholder="One sentence on what this partner contributes"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ecd-partner-asset">Supported asset</Label>
            <Input
              id="ecd-partner-asset"
              value={form.supportedAsset}
              onChange={(e) => setForm((f) => ({ ...f, supportedAsset: e.target.value }))}
              placeholder="Main Stage, Presented by …"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ecd-partner-exp">Experience URL</Label>
            <Input
              id="ecd-partner-exp"
              value={form.experienceUrl}
              onChange={(e) => setForm((f) => ({ ...f, experienceUrl: e.target.value }))}
              placeholder="Link for Explore the Supported Experience"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="ecd-partner-featured">Featured on sponsors page</Label>
            <Switch
              id="ecd-partner-featured"
              checked={form.featured}
              onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))}
            />
          </div>
          {form.featured ? (
            <div className="space-y-1">
              <Label htmlFor="ecd-partner-fsort">Featured sort</Label>
              <Input
                id="ecd-partner-fsort"
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
          ) : null}
          <div className="flex items-center justify-between">
            <Label htmlFor="ecd-partner-home">Show on homepage marquee</Label>
            <Switch
              id="ecd-partner-home"
              checked={form.showOnHome}
              onCheckedChange={(v) => setForm((f) => ({ ...f, showOnHome: v }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ecd-partner-sort">Sort order (tier grid)</Label>
            <Input
              id="ecd-partner-sort"
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: Number.parseInt(e.target.value, 10) || 0 }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="ecd-partner-pub">Published</Label>
            <Switch
              id="ecd-partner-pub"
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

const EcdPartnersPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EcdPartner | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin', 'ecd-partners'],
    queryFn: fetchEcdPartners,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEcdPartner,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ecd-partners'] });
      toast({ title: 'Sponsor deleted' });
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
                <Handshake className="h-6 w-6" />
                ECD Sponsors
              </h1>
              <p className="text-sm text-neutral-600">
                Sponsors page tiers + featured band, and homepage partner marquee.
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
              Add sponsor
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-neutral-500">
                No sponsors yet. Add published sponsors to fill sponsors.html and the homepage
                marquee.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <div className="flex flex-wrap gap-1">
                      {p.featured ? <Badge>Featured</Badge> : null}
                      <Badge variant={p.published ? 'default' : 'secondary'}>
                        {p.published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {p.logoUrl ? (
                      <img
                        src={p.logoUrl}
                        alt=""
                        className="h-14 max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-14 items-center justify-center rounded bg-neutral-50 text-xs text-neutral-400">
                        No logo
                      </div>
                    )}
                    <div className="text-xs text-neutral-500">
                      {tierLabel(p.tier)} · Sort {p.sortOrder}
                      {p.showOnHome ? ' · Home' : ''}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(p);
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
                          if (window.confirm(`Delete ${p.name}?`)) {
                            deleteMutation.mutate(p.id);
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

          <PartnerFormDialog
            key={editing?.id ?? 'new'}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            partnerId={editing?.id ?? null}
            initial={
              editing
                ? {
                    name: editing.name,
                    logoUrl: editing.logoUrl || '',
                    websiteUrl: editing.websiteUrl || '',
                    tier: (TIERS.some((t) => t.id === editing.tier)
                      ? editing.tier
                      : 'community') as TierId,
                    blurb: editing.blurb || '',
                    supportedAsset: editing.supportedAsset || '',
                    experienceUrl: editing.experienceUrl || '',
                    featured: editing.featured,
                    featuredSortOrder: editing.featuredSortOrder ?? 0,
                    showOnHome: editing.showOnHome !== false,
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

export default EcdPartnersPage;
