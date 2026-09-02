import { PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  cancelNotificationCampaign,
  createNotificationCampaign,
  fetchNotificationCampaigns,
  previewAudience,
  previewCampaignAudience,
  scheduleNotificationCampaign,
  sendNotificationCampaign,
  type AudiencePreview,
  type AudienceSpec,
  type NotificationCampaign,
} from '@/app/api/notifications';
import { BilingualRichTextField } from '@/shared/components/admin/BilingualRichTextField';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

type AudienceType = AudienceSpec['type'];

type FormState = {
  titleEn: string;
  titleAr: string;
  bodyHtmlEn: string;
  bodyHtmlAr: string;
  audienceType: AudienceType;
  audienceId: string;
  roles: string;
};

const emptyForm = (): FormState => ({
  titleEn: '',
  titleAr: '',
  bodyHtmlEn: '',
  bodyHtmlAr: '',
  audienceType: 'all_users',
  audienceId: '',
  roles: 'user',
});

function buildAudience(form: FormState): AudienceSpec | null {
  switch (form.audienceType) {
    case 'all_users':
      return { type: 'all_users' };
    case 'event_attendees':
      return form.audienceId ? { type: 'event_attendees', eventId: form.audienceId } : null;
    case 'track_buyers':
      return form.audienceId ? { type: 'track_buyers', trackId: form.audienceId } : null;
    case 'masterclass_enrollees':
      return form.audienceId
        ? { type: 'masterclass_enrollees', masterclassId: form.audienceId }
        : null;
    case 'activity_channel_members':
      return form.audienceId
        ? { type: 'activity_channel_members', channelId: form.audienceId }
        : null;
    case 'role_based': {
      const roles = form.roles
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      return roles.length ? { type: 'role_based', roles } : null;
    }
    case 'explicit_users': {
      const userIds = form.audienceId
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      return userIds.length ? { type: 'explicit_users', userIds } : null;
    }
    default:
      return null;
  }
}

function PreviewCounts({ preview }: { preview: AudiencePreview | null }) {
  if (!preview) return null;
  return (
    <div className="rounded-md border bg-neutral-50 p-3 text-sm text-neutral-700">
      <p>
        Total recipients: <strong>{preview.total}</strong>
      </p>
      <p>
        Email deliverable: {preview.emailDeliverable} · skipped: {preview.emailSkipped}
      </p>
      <p>
        WhatsApp eligible: {preview.whatsappEligible} · skipped: {preview.whatsappSkipped}
      </p>
    </div>
  );
}

function AnnouncementsCampaignsPage() {
  const [items, setItems] = useState<NotificationCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [scheduleAt, setScheduleAt] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    setItems(await fetchNotificationCampaigns('announcement'));
  };

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
    setPreview(null);
    setShowForm(false);
    setScheduleAt('');
  };

  const handlePreviewAudience = async () => {
    const audience = buildAudience(form);
    if (!audience) {
      setError('Complete the audience fields before preview.');
      return;
    }
    try {
      setError(null);
      setPreview(await previewAudience(audience));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    }
  };

  const handleCreate = async () => {
    const audience = buildAudience(form);
    if (!audience) {
      setError('Complete the audience fields before creating.');
      return;
    }
    try {
      setError(null);
      await createNotificationCampaign({
        titleEn: form.titleEn,
        titleAr: form.titleAr,
        bodyHtmlEn: form.bodyHtmlEn,
        bodyHtmlAr: form.bodyHtmlAr,
        audience,
      });
      resetForm();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  };

  const runAction = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      setError(null);
      await action();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const needsAudienceId = ![
    'all_users',
    'role_based',
  ].includes(form.audienceType);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Notification Campaigns</h1>
          <p className="mt-1 text-neutral-600">
            Compose announcement blasts, preview audience counts, send or schedule.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New campaign
        </Button>
      </div>

      {error ? <p className="text-red-600">{error}</p> : null}

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>New announcement campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="camp-title-en">Title (English)</Label>
                <Input
                  id="camp-title-en"
                  value={form.titleEn}
                  onChange={(e) => setForm((p) => ({ ...p, titleEn: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="camp-title-ar">Title (Arabic)</Label>
                <Input
                  id="camp-title-ar"
                  dir="rtl"
                  lang="ar"
                  value={form.titleAr}
                  onChange={(e) => setForm((p) => ({ ...p, titleAr: e.target.value }))}
                />
              </div>
            </div>
            <BilingualRichTextField
              label="Campaign body"
              valueEn={form.bodyHtmlEn}
              valueAr={form.bodyHtmlAr}
              onChangeEn={(v) => setForm((p) => ({ ...p, bodyHtmlEn: v }))}
              onChangeAr={(v) => setForm((p) => ({ ...p, bodyHtmlAr: v }))}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="camp-audience">Audience</Label>
                <select
                  id="camp-audience"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.audienceType}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      audienceType: e.target.value as AudienceType,
                      audienceId: '',
                    }))
                  }
                >
                  <option value="all_users">All users</option>
                  <option value="event_attendees">Event attendees</option>
                  <option value="track_buyers">Track buyers</option>
                  <option value="masterclass_enrollees">Masterclass enrollees</option>
                  <option value="activity_channel_members">Activity channel members</option>
                  <option value="role_based">Role-based</option>
                  <option value="explicit_users">Explicit user IDs</option>
                </select>
              </div>
              {form.audienceType === 'role_based' ? (
                <div className="space-y-2">
                  <Label htmlFor="camp-roles">Roles (comma-separated)</Label>
                  <Input
                    id="camp-roles"
                    value={form.roles}
                    onChange={(e) => setForm((p) => ({ ...p, roles: e.target.value }))}
                    placeholder="user, expert"
                  />
                </div>
              ) : needsAudienceId ? (
                <div className="space-y-2">
                  <Label htmlFor="camp-audience-id">
                    {form.audienceType === 'explicit_users'
                      ? 'User IDs (comma-separated)'
                      : 'Target ID (UUID)'}
                  </Label>
                  <Input
                    id="camp-audience-id"
                    value={form.audienceId}
                    onChange={(e) => setForm((p) => ({ ...p, audienceId: e.target.value }))}
                  />
                </div>
              ) : null}
            </div>
            <PreviewCounts preview={preview} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void handlePreviewAudience()}>
                Preview audience
              </Button>
              <Button type="button" onClick={() => void handleCreate()}>
                Save draft
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm}>
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
                    <Badge variant="secondary">{item.audienceType ?? 'audience'}</Badge>
                    {item.scheduledAt ? (
                      <Badge variant="secondary">
                        Scheduled: {new Date(item.scheduledAt).toLocaleString()}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">
                    <Link
                      className="underline"
                      to={`/admin/notifications/deliveries?campaignId=${item.id}`}
                    >
                      View deliveries
                    </Link>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['draft', 'scheduled'].includes(item.status) ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() =>
                          void runAction(item.id, async () => {
                            const counts = await previewCampaignAudience(item.id);
                            setPreview(counts);
                          })
                        }
                      >
                        Preview
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId === item.id}
                        onClick={() =>
                          void runAction(item.id, () => sendNotificationCampaign(item.id))
                        }
                      >
                        Send now
                      </Button>
                      <Input
                        type="datetime-local"
                        className="w-auto"
                        value={scheduleAt}
                        onChange={(e) => setScheduleAt(e.target.value)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id || !scheduleAt}
                        onClick={() => {
                          if (!scheduleAt) return;
                          void runAction(item.id, () =>
                            scheduleNotificationCampaign(
                              item.id,
                              new Date(scheduleAt).toISOString(),
                            ),
                          );
                        }}
                      >
                        Schedule
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={busyId === item.id}
                        onClick={() =>
                          void runAction(item.id, () => cancelNotificationCampaign(item.id))
                        }
                      >
                        Cancel
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardHeader>
            </Card>
          ))}
          {items.length === 0 ? (
            <p className="text-neutral-500">No announcement campaigns yet.</p>
          ) : null}
          <PreviewCounts preview={preview} />
        </div>
      )}
    </div>
  );
}

export default function AdminNotificationAnnouncementsPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <AnnouncementsCampaignsPage />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
