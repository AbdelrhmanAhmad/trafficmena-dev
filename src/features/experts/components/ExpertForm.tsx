import DOMPurify from 'dompurify';
import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  archiveExpert,
  assignExpertUser,
  createExpert,
  deleteExpertPermanent,
  fetchExpertAdmin,
  fetchExpertsAdmin,
  publishExpert,
  restoreExpert,
  unpublishExpert,
  updateExpert,
  type ExpertAdminRecord,
  type ExpertPayload,
} from '@/app/api/experts';
import { fetchSkills, type SkillRecord } from '@/app/api/skills';
import { fetchUsersAdmin, type AdminUserRecord } from '@/app/api/users';
import { uploadFile } from '@/app/api/uploads';
import { BilingualRichTextField } from '@/shared/components/admin/BilingualRichTextField';
import { BilingualTextField } from '@/shared/components/admin/BilingualTextField';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useToast } from '@/shared/hooks/custom/use-toast';

export type ExpertFormState = {
  slug: string;
  displayNameEn: string;
  displayNameAr: string;
  headlineEn: string;
  headlineAr: string;
  bioEn: string;
  bioAr: string;
  avatarUrl: string;
  websiteUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
  assignedUserId: string;
  skillIds: string[];
};

export const emptyExpertForm = (): ExpertFormState => ({
  slug: '',
  displayNameEn: '',
  displayNameAr: '',
  headlineEn: '',
  headlineAr: '',
  bioEn: '',
  bioAr: '',
  avatarUrl: '',
  websiteUrl: '',
  linkedinUrl: '',
  twitterUrl: '',
  assignedUserId: '',
  skillIds: [],
});

export function expertToForm(expert: ExpertAdminRecord, skillIds: string[]): ExpertFormState {
  return {
    slug: expert.slug,
    displayNameEn: expert.displayNameEn,
    displayNameAr: expert.displayNameAr,
    headlineEn: expert.headlineEn ?? '',
    headlineAr: expert.headlineAr ?? '',
    bioEn: expert.bioEn ?? '',
    bioAr: expert.bioAr ?? '',
    avatarUrl: expert.avatarUrl ?? '',
    websiteUrl: expert.websiteUrl ?? '',
    linkedinUrl: expert.linkedinUrl ?? '',
    twitterUrl: expert.twitterUrl ?? '',
    assignedUserId: expert.assignedUserId ?? '',
    skillIds,
  };
}

export function formToPayload(form: ExpertFormState): ExpertPayload {
  return {
    slug: form.slug.trim() || undefined,
    displayNameEn: form.displayNameEn.trim(),
    displayNameAr: form.displayNameAr.trim(),
    headlineEn: form.headlineEn.trim() || null,
    headlineAr: form.headlineAr.trim() || null,
    bioEn: form.bioEn.trim() || null,
    bioAr: form.bioAr.trim() || null,
    avatarUrl: form.avatarUrl.trim() || null,
    websiteUrl: form.websiteUrl.trim() || null,
    linkedinUrl: form.linkedinUrl.trim() || null,
    twitterUrl: form.twitterUrl.trim() || null,
    assignedUserId: form.assignedUserId || null,
    skillIds: form.skillIds,
  };
}

type ExpertFormProps = {
  mode: 'create' | 'edit';
  expertId?: string;
  onSaved: (expert: ExpertAdminRecord) => void;
  onCancel: () => void;
};

export function ExpertForm({ mode, expertId, onSaved, onCancel }: ExpertFormProps) {
  const { toast } = useToast();
  const avatarInputId = useId();
  const [form, setForm] = useState<ExpertFormState>(emptyExpertForm());
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [skillItems, userPage] = await Promise.all([
          fetchSkills(),
          fetchUsersAdmin({ page: 1, pageSize: 100 }),
        ]);
        if (cancelled) return;
        setSkills(skillItems);
        setUsers(userPage.items ?? []);
      } catch (error) {
        if (!cancelled) {
          toast({
            title: 'Failed to load form data',
            description: error instanceof Error ? error.message : 'Unknown error',
            variant: 'destructive',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (mode !== 'edit' || !expertId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await fetchExpertAdmin(expertId);
        if (!cancelled) setForm(expertToForm(data.expert, data.skillIds));
      } catch (error) {
        if (!cancelled) {
          toast({
            title: 'Failed to load expert',
            description: error instanceof Error ? error.message : 'Unknown error',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expertId, mode, toast]);

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        id: user.id,
        label: `${user.name || 'Member'} · ${user.email}`,
      })),
    [users],
  );

  const toggleSkill = (skillId: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      skillIds: checked
        ? [...prev.skillIds, skillId]
        : prev.skillIds.filter((id) => id !== skillId),
    }));
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile({ file, scope: 'general' });
      setForm((prev) => ({ ...prev, avatarUrl: result.url }));
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = formToPayload(form);
      const response =
        mode === 'create'
          ? await createExpert(payload)
          : await updateExpert(expertId!, payload);
      toast({ title: mode === 'create' ? 'Expert created' : 'Expert updated' });
      onSaved(response.expert);
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <BilingualTextField
        label="Display Name"
        valueEn={form.displayNameEn}
        valueAr={form.displayNameAr}
        onChangeEn={(value) => setForm((prev) => ({ ...prev, displayNameEn: value }))}
        onChangeAr={(value) => setForm((prev) => ({ ...prev, displayNameAr: value }))}
        required
      />

      <BilingualTextField
        label="Headline"
        valueEn={form.headlineEn}
        valueAr={form.headlineAr}
        onChangeEn={(value) => setForm((prev) => ({ ...prev, headlineEn: value }))}
        onChangeAr={(value) => setForm((prev) => ({ ...prev, headlineAr: value }))}
      />

      <BilingualRichTextField
        label="Bio (About the Expert)"
        valueEn={form.bioEn}
        valueAr={form.bioAr}
        onChangeEn={(value) => setForm((prev) => ({ ...prev, bioEn: value }))}
        onChangeAr={(value) => setForm((prev) => ({ ...prev, bioAr: value }))}
      />

      <div className="space-y-2">
        <Label htmlFor="expert-slug">Slug</Label>
        <Input
          id="expert-slug"
          dir="ltr"
          lang="en"
          value={form.slug}
          onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
          placeholder="ahmed-hassan"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={avatarInputId}>Profile image</Label>
        <Input
          id={avatarInputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={uploading}
          onChange={(event) => void handleAvatarUpload(event.target.files?.[0] ?? null)}
        />
        {form.avatarUrl ? (
          <img src={form.avatarUrl} alt="" className="h-24 w-24 rounded-full object-cover" />
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Website</Label>
          <Input
            dir="ltr"
            value={form.websiteUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, websiteUrl: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>LinkedIn</Label>
          <Input
            dir="ltr"
            value={form.linkedinUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, linkedinUrl: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>X (Twitter)</Label>
          <Input
            dir="ltr"
            value={form.twitterUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, twitterUrl: event.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Assigned user (optional)</Label>
        <Select
          value={form.assignedUserId || '__none__'}
          onValueChange={(value) =>
            setForm((prev) => ({ ...prev, assignedUserId: value === '__none__' ? '' : value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="No user assigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No user assigned</SelectItem>
            {userOptions.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {skills.length > 0 ? (
        <div className="space-y-2">
          <Label>Expertise / Skills</Label>
          <div className="grid gap-2 md:grid-cols-2">
            {skills.map((skill) => {
              const checked = form.skillIds.includes(skill.id);
              const checkboxId = `skill-${skill.id}`;
              return (
                <label key={skill.id} htmlFor={checkboxId} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    onCheckedChange={(value) => toggleSkill(skill.id, value === true)}
                  />
                  <span>{skill.nameEn ?? skill.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => void handleSubmit()} disabled={saving || uploading}>
          {saving ? 'Saving…' : mode === 'create' ? 'Create expert' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

type ExpertLifecycleActionsProps = {
  expert: ExpertAdminRecord;
  onChanged: (expert: ExpertAdminRecord) => void;
};

export function ExpertLifecycleActions({ expert, onChanged }: ExpertLifecycleActionsProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<{ expert?: ExpertAdminRecord }>) => {
    setBusy(true);
    try {
      const result = await action();
      if (result.expert) onChanged(result.expert);
      toast({ title: 'Updated' });
    } catch (error) {
      toast({
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {!expert.archivedAt && !expert.isPublished ? (
        <Button type="button" disabled={busy} onClick={() => void run(() => publishExpert(expert.id))}>
          Publish
        </Button>
      ) : null}
      {!expert.archivedAt && expert.isPublished ? (
        <Button type="button" variant="outline" disabled={busy} onClick={() => void run(() => unpublishExpert(expert.id))}>
          Unpublish
        </Button>
      ) : null}
      {!expert.archivedAt ? (
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void run(() => archiveExpert(expert.id))}>
          Archive
        </Button>
      ) : (
        <Button type="button" disabled={busy} onClick={() => void run(() => restoreExpert(expert.id))}>
          Restore
        </Button>
      )}
      {expert.slug ? (
        <Button type="button" variant="outline" asChild>
          <Link to={`/experts/${expert.slug}`} target="_blank" rel="noreferrer">
            Preview public profile
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

export function useExpertsAdminList() {
  const [items, setItems] = useState<ExpertAdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchExpertsAdmin());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  return { items, loading, error, reload };
}

export function sanitizeExpertBioHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
