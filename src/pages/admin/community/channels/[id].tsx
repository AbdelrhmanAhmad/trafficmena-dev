import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchTracks } from '@/app/api/tracks';
import { uploadFile } from '@/app/api/uploads';
import {
  archiveAdminCommunityChannel,
  createAdminCommunityChannel,
  deleteAdminCommunityChannel,
  fetchAdminCommunityChannels,
  restoreAdminCommunityChannel,
  updateAdminCommunityChannel,
  type ChannelPayload,
  type CommunityChannelType,
} from '@/app/api/community';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
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

function ChannelFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Array<{ id: string; title: string }>>([]);

  const [form, setForm] = useState<ChannelPayload>({
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    channelType: 'open',
    coverImageUrl: '',
    requiresApproval: true,
    sortOrder: 0,
    slug: '',
    entitlements: [],
  });

  useEffect(() => {
    void (async () => {
      try {
        const trackRes = await fetchTracks({ page: 1, pageSize: 100 });
        setTracks(trackRes.items.map((t) => ({ id: t.id, title: t.title })));
      } catch {
        // tracks optional for entitlement picker
      }
    })();
  }, []);

  useEffect(() => {
    if (isNew || !id) return;
    void (async () => {
      try {
        const items = await fetchAdminCommunityChannels();
        const channel = items.find((c) => c.id === id);
        if (!channel) {
          setError('Channel not found');
          return;
        }
        setForm({
          nameEn: channel.nameEn,
          nameAr: channel.nameAr,
          descriptionEn: channel.descriptionEn,
          descriptionAr: channel.descriptionAr,
          channelType: channel.channelType,
          coverImageUrl: channel.coverImageUrl,
          requiresApproval: channel.requiresApproval,
          sortOrder: channel.sortOrder,
          slug: channel.slug,
          entitlements: channel.entitlements,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load channel');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const handleCoverUpload = async (file: File) => {
    const result = await uploadFile({ file, scope: 'community' });
    setForm((prev) => ({ ...prev, coverImageUrl: result.url }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        slug: form.slug?.trim() || undefined,
        entitlements:
          form.channelType === 'entitlement_gated' ? form.entitlements : [],
      };
      if (isNew) {
        const { channel } = await createAdminCommunityChannel(payload);
        navigate(`/admin/community/channels/${channel.id}`);
      } else if (id) {
        await updateAdminCommunityChannel(id, payload);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleTrackEntitlement = (trackId: string) => {
    setForm((prev) => {
      const existing = prev.entitlements ?? [];
      const found = existing.find((e) => e.trackId === trackId);
      if (found) {
        return { ...prev, entitlements: existing.filter((e) => e.trackId !== trackId) };
      }
      return { ...prev, entitlements: [...existing, { trackId, masterclassId: null }] };
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isNew ? 'New channel' : 'Edit channel'}</h1>
        <Button variant="outline" asChild>
          <Link to="/admin/community/channels">Back to list</Link>
        </Button>
      </div>

      {error ? <p className="text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Channel details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name (English)</Label>
              <Input
                value={form.nameEn}
                onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Name (Arabic)</Label>
              <Input dir="rtl" lang="ar" value={form.nameAr} onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Description (English)</Label>
              <Textarea value={form.descriptionEn ?? ''} onChange={(e) => setForm((p) => ({ ...p, descriptionEn: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description (Arabic)</Label>
              <Textarea dir="rtl" lang="ar" value={form.descriptionAr ?? ''} onChange={(e) => setForm((p) => ({ ...p, descriptionAr: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Slug (optional)</Label>
            <Input dir="ltr" value={form.slug ?? ''} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="auto-generated from English name" />
          </div>
          <div className="space-y-2">
            <Label>Channel type</Label>
            <Select
              value={form.channelType}
              onValueChange={(v) => setForm((p) => ({ ...p, channelType: v as CommunityChannelType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open (authenticated)</SelectItem>
                <SelectItem value="staff_post">Staff-post only</SelectItem>
                <SelectItem value="entitlement_gated">Entitlement-gated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.channelType === 'entitlement_gated' ? (
            <div className="space-y-2">
              <Label>Track entitlements</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded border p-3">
                {tracks.length === 0 ? (
                  <p className="text-sm text-neutral-500">No tracks loaded.</p>
                ) : (
                  tracks.map((track) => {
                    const selected = (form.entitlements ?? []).some((e) => e.trackId === track.id);
                    return (
                      <label key={track.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="checkbox" checked={selected} onChange={() => toggleTrackEntitlement(track.id)} />
                        {track.title}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <Switch
              checked={form.requiresApproval ?? true}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, requiresApproval: checked }))}
            />
            <Label>Require approval for member posts</Label>
          </div>
          <div className="space-y-2">
            <Label>Cover image</Label>
            {form.coverImageUrl ? (
              <img src={form.coverImageUrl} alt="" className="mb-2 h-32 rounded object-cover" />
            ) : null}
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleCoverUpload(file);
              }}
            />
          </div>
          <Button disabled={saving || !form.nameEn || !form.nameAr || !form.coverImageUrl} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Save channel'}
          </Button>
        </CardContent>
      </Card>

      {!isNew && id ? (
        <Card>
          <CardHeader>
            <CardTitle>Lifecycle</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void archiveAdminCommunityChannel(id).then(() => navigate(0))}
            >
              Archive
            </Button>
            <Button
              variant="outline"
              onClick={() => void restoreAdminCommunityChannel(id).then(() => navigate(0))}
            >
              Restore
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm('Permanently delete this channel?')) {
                  void deleteAdminCommunityChannel(id).then(() => navigate('/admin/community/channels'));
                }
              }}
            >
              Delete permanently
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function AdminCommunityChannelEditPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <ChannelFormPage />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
