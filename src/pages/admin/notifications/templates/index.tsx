import { PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  activateNotificationTemplate,
  createNotificationTemplate,
  deactivateNotificationTemplate,
  fetchNotificationTemplates,
  updateNotificationTemplate,
  type NotificationTemplate,
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
import { Textarea } from '@/shared/components/ui/textarea';

type FormState = {
  key: string;
  category: string;
  channel: 'email' | 'whatsapp';
  subjectEn: string;
  subjectAr: string;
  bodyHtmlEn: string;
  bodyHtmlAr: string;
  bodyTextEn: string;
  bodyTextAr: string;
};

const emptyForm = (): FormState => ({
  key: '',
  category: 'announcement',
  channel: 'email',
  subjectEn: '',
  subjectAr: '',
  bodyHtmlEn: '',
  bodyHtmlAr: '',
  bodyTextEn: '',
  bodyTextAr: '',
});

function TemplatesAdminPage() {
  const [items, setItems] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const reload = async () => {
    setItems(await fetchNotificationTemplates());
  };

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    try {
      setError(null);
      if (editingId) {
        await updateNotificationTemplate(editingId, {
          category: form.category,
          subjectEn: form.subjectEn,
          subjectAr: form.subjectAr,
          bodyHtmlEn: form.bodyHtmlEn,
          bodyHtmlAr: form.bodyHtmlAr,
          bodyTextEn: form.bodyTextEn,
          bodyTextAr: form.bodyTextAr,
        });
      } else {
        await createNotificationTemplate(form);
      }
      resetForm();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const startEdit = (item: NotificationTemplate) => {
    setEditingId(item.id);
    setShowForm(true);
    setForm({
      key: item.key,
      category: item.category,
      channel: item.channel,
      subjectEn: item.subjectEn,
      subjectAr: item.subjectAr,
      bodyHtmlEn: item.bodyHtmlEn,
      bodyHtmlAr: item.bodyHtmlAr,
      bodyTextEn: item.bodyTextEn,
      bodyTextAr: item.bodyTextAr,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Notification Templates</h1>
          <p className="mt-1 text-neutral-600">Manage bilingual email/WhatsApp notification templates.</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New template
        </Button>
      </div>

      {error ? <p className="text-red-600">{error}</p> : null}

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit template' : 'New template'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="tmpl-key">Key</Label>
                <Input
                  id="tmpl-key"
                  value={form.key}
                  disabled={Boolean(editingId)}
                  onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tmpl-category">Category</Label>
                <Input
                  id="tmpl-category"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tmpl-channel">Channel</Label>
                <select
                  id="tmpl-channel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.channel}
                  disabled={Boolean(editingId)}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      channel: e.target.value as 'email' | 'whatsapp',
                    }))
                  }
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tmpl-subject-en">Subject (English)</Label>
                <Input
                  id="tmpl-subject-en"
                  value={form.subjectEn}
                  onChange={(e) => setForm((p) => ({ ...p, subjectEn: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tmpl-subject-ar">Subject (Arabic)</Label>
                <Input
                  id="tmpl-subject-ar"
                  dir="rtl"
                  lang="ar"
                  value={form.subjectAr}
                  onChange={(e) => setForm((p) => ({ ...p, subjectAr: e.target.value }))}
                />
              </div>
            </div>
            <BilingualRichTextField
              label="HTML body"
              valueEn={form.bodyHtmlEn}
              valueAr={form.bodyHtmlAr}
              onChangeEn={(v) => setForm((p) => ({ ...p, bodyHtmlEn: v }))}
              onChangeAr={(v) => setForm((p) => ({ ...p, bodyHtmlAr: v }))}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tmpl-text-en">Plain text (English)</Label>
                <Textarea
                  id="tmpl-text-en"
                  rows={4}
                  value={form.bodyTextEn}
                  onChange={(e) => setForm((p) => ({ ...p, bodyTextEn: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tmpl-text-ar">Plain text (Arabic)</Label>
                <Textarea
                  id="tmpl-text-ar"
                  dir="rtl"
                  lang="ar"
                  rows={4}
                  value={form.bodyTextAr}
                  onChange={(e) => setForm((p) => ({ ...p, bodyTextAr: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void handleSave()}>
                Save
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
                  <CardTitle className="font-mono text-lg">{item.key}</CardTitle>
                  <p className="mt-1 text-sm text-neutral-500">
                    {item.category} · {item.channel}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={item.isActive ? 'default' : 'outline'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-neutral-700">{item.subjectEn || '(no subject)'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => startEdit(item)}>
                    Edit
                  </Button>
                  {item.isActive ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void deactivateNotificationTemplate(item.id)
                          .then(reload)
                          .catch((err) =>
                            setError(err instanceof Error ? err.message : 'Deactivate failed'),
                          )
                      }
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        void activateNotificationTemplate(item.id)
                          .then(reload)
                          .catch((err) =>
                            setError(err instanceof Error ? err.message : 'Activate failed'),
                          )
                      }
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
          {items.length === 0 ? (
            <p className="text-neutral-500">No templates yet.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function AdminNotificationTemplatesPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <TemplatesAdminPage />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
