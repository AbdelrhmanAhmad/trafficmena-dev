import { PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  archiveAdminCommunityAnnouncement,
  cancelAdminCommunityAnnouncement,
  createAdminCommunityAnnouncement,
  fetchAdminCommunityAnnouncements,
  publishAdminCommunityAnnouncement,
  scheduleAdminCommunityAnnouncement,
  updateAdminCommunityAnnouncement,
  type AdminCommunityAnnouncement,
} from '@/app/api/community';
import { BilingualRichTextField } from '@/shared/components/admin/BilingualRichTextField';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

function AnnouncementsAdminPage() {
  const [items, setItems] = useState<AdminCommunityAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState('');
  const [form, setForm] = useState({
    titleEn: '',
    titleAr: '',
    bodyEn: '',
    bodyAr: '',
    channelId: null as string | null,
  });

  const reload = async () => {
    setItems(await fetchAdminCommunityAnnouncements());
  };

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load announcements');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resetForm = () => {
    setForm({ titleEn: '', titleAr: '', bodyEn: '', bodyAr: '', channelId: null });
    setEditingId(null);
    setShowForm(false);
    setScheduleAt('');
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateAdminCommunityAnnouncement(editingId, form);
      } else {
        await createAdminCommunityAnnouncement(form);
      }
      resetForm();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const startEdit = (item: AdminCommunityAnnouncement) => {
    setEditingId(item.id);
    setShowForm(true);
    setForm({
      titleEn: item.titleEn,
      titleAr: item.titleAr,
      bodyEn: item.bodyEn,
      bodyAr: item.bodyAr,
      channelId: item.channelId,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Announcements</h1>
          <p className="mt-1 text-neutral-600">Platform announcements for the Activity Hub (W11 adds delivery).</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New announcement
        </Button>
      </div>

      {error ? <p className="text-red-600">{error}</p> : null}

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit announcement' : 'New announcement'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title (English)</Label>
                <Input value={form.titleEn} onChange={(e) => setForm((p) => ({ ...p, titleEn: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Title (Arabic)</Label>
                <Input dir="rtl" lang="ar" value={form.titleAr} onChange={(e) => setForm((p) => ({ ...p, titleAr: e.target.value }))} />
              </div>
            </div>
            <BilingualRichTextField
              label="Announcement body"
              valueEn={form.bodyEn}
              valueAr={form.bodyAr}
              onChangeEn={(v) => setForm((p) => ({ ...p, bodyEn: v }))}
              onChangeAr={(v) => setForm((p) => ({ ...p, bodyAr: v }))}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleSave()}>Save draft</Button>
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{item.titleEn}</CardTitle>
                  <p className="text-sm text-neutral-500" dir="rtl" lang="ar">
                    {item.titleAr}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{item.status}</Badge>
                    {item.scheduledAt ? (
                      <Badge variant="secondary">Scheduled: {new Date(item.scheduledAt).toLocaleString()}</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['draft', 'scheduled'].includes(item.status) ? (
                    <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                      Edit
                    </Button>
                  ) : null}
                  {['draft', 'scheduled'].includes(item.status) ? (
                    <Button
                      size="sm"
                      onClick={() => void publishAdminCommunityAnnouncement(item.id).then(reload)}
                    >
                      Publish now
                    </Button>
                  ) : null}
                  {item.status === 'scheduled' ? (
                    <>
                      <Input
                        type="datetime-local"
                        className="w-auto"
                        value={scheduleAt}
                        onChange={(e) => setScheduleAt(e.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (!scheduleAt) return;
                          void scheduleAdminCommunityAnnouncement(
                            item.id,
                            new Date(scheduleAt).toISOString(),
                          ).then(reload);
                        }}
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void cancelAdminCommunityAnnouncement(item.id).then(reload)}
                      >
                        Cancel scheduled
                      </Button>
                    </>
                  ) : null}
                  {item.status === 'draft' && scheduleAt ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void scheduleAdminCommunityAnnouncement(
                          item.id,
                          new Date(scheduleAt).toISOString(),
                        ).then(reload)
                      }
                    >
                      Schedule
                    </Button>
                  ) : null}
                  {!item.archivedAt ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void archiveAdminCommunityAnnouncement(item.id).then(reload)}
                    >
                      Archive
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCommunityAnnouncementsPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <AnnouncementsAdminPage />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
