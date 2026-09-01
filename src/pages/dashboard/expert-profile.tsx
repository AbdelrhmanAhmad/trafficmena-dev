import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchMyExpertProfile, updateMyExpertProfile } from '@/app/api/experts';
import { fetchSkills, type SkillRecord } from '@/app/api/skills';
import { uploadFile } from '@/app/api/uploads';
import { emptyExpertForm, expertToForm, formToPayload } from '@/features/experts/components/ExpertForm';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { BilingualRichTextField } from '@/shared/components/admin/BilingualRichTextField';
import { BilingualTextField } from '@/shared/components/admin/BilingualTextField';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/custom/use-toast';

function MemberExpertProfileEditor() {
  const { t } = useTranslation(['experts', 'dashboard']);
  const { toast } = useToast();
  const [form, setForm] = useState(emptyExpertForm());
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [profile, skillItems] = await Promise.all([fetchMyExpertProfile(), fetchSkills()]);
        if (cancelled) return;
        setForm(expertToForm(profile.expert, profile.skillIds));
        setCanEdit(profile.canEdit);
        setSkills(skillItems);
      } catch (error) {
        if (!cancelled) {
          toast({
            title: t('experts:profileUnavailable'),
            description: error instanceof Error ? error.message : undefined,
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
  }, [t, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = formToPayload(form);
      delete payload.slug;
      delete payload.assignedUserId;
      delete payload.isPublished;
      await updateMyExpertProfile(payload);
      toast({ title: t('experts:saveProfile') });
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

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-neutral-600">{t('experts:profileUnavailable')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">{t('experts:editExpertProfile')}</h1>
      </div>

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
        <Label>Profile image</Label>
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void uploadFile({ file, scope: 'general' }).then((result) => {
              setForm((prev) => ({ ...prev, avatarUrl: result.url }));
            });
          }}
        />
        {form.avatarUrl ? (
          <img src={form.avatarUrl} alt="" className="h-24 w-24 rounded-full object-cover" />
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>{t('experts:website')}</Label>
          <Input
            dir="ltr"
            value={form.websiteUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, websiteUrl: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('experts:linkedin')}</Label>
          <Input
            dir="ltr"
            value={form.linkedinUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, linkedinUrl: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('experts:twitter')}</Label>
          <Input
            dir="ltr"
            value={form.twitterUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, twitterUrl: event.target.value }))}
          />
        </div>
      </div>

      {skills.length > 0 ? (
        <div className="space-y-2">
          <Label>{t('experts:expertise')}</Label>
          <div className="grid gap-2 md:grid-cols-2">
            {skills.map((skill) => {
              const checked = form.skillIds.includes(skill.id);
              const checkboxId = `member-skill-${skill.id}`;
              return (
                <label key={skill.id} htmlFor={checkboxId} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    onCheckedChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        skillIds:
                          value === true
                            ? [...prev.skillIds, skill.id]
                            : prev.skillIds.filter((id) => id !== skill.id),
                      }))
                    }
                  />
                  <span>{skill.nameEn ?? skill.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <Button type="button" disabled={saving} onClick={() => void handleSave()}>
        {t('experts:saveProfile')}
      </Button>
    </div>
  );
}

export default function DashboardExpertProfilePage() {
  return (
    <ProtectedRoute>
      <AppLayout variant="member">
        <MemberExpertProfileEditor />
      </AppLayout>
    </ProtectedRoute>
  );
}
