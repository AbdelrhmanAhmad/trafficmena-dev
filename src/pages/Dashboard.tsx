import { Edit, Sparkles } from 'lucide-react';
import type React from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import type { SkillRecord } from '@/app/api/skills';
import { useCurrentUser, useUpdateCurrentUser } from '@/app/hooks/useCurrentUser';
import {
  useAddUserSkill,
  useCreateSkill,
  useRemoveUserSkill,
  useSkills,
  useUserSkills,
} from '@/app/hooks/useSkills';
import { trackProfileUpdated } from '@/lib/analytics/events';
import {
  getProfileCompletion,
  getUpdatedProfileFields,
  type ProfileAnalyticsSnapshot,
} from '@/lib/analytics/profile';
import AppLayout from '@/shared/components/layout/AppLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { validateAndSanitizeSkillName } from '@/shared/utils/inputSanitization';

interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  primaryGoal: string;
  primaryChallenge: string;
}

const EMPTY_PROFILE_ANALYTICS_SNAPSHOT: ProfileAnalyticsSnapshot = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  primaryGoal: '',
  primaryChallenge: '',
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const goalId = useId();
  const challengeId = useId();

  const { data: profileResponse, isLoading: profileLoading } = useCurrentUser();
  const { data: skillsData, isLoading: skillsLoading } = useSkills();
  const { data: userSkillsData, isLoading: userSkillsLoading } = useUserSkills();

  const updateProfileMutation = useUpdateCurrentUser();
  const addUserSkillMutation = useAddUserSkill();
  const removeUserSkillMutation = useRemoveUserSkill();
  const createSkillMutation = useCreateSkill();

  const [formData, setFormData] = useState<ProfileFormState>({
    firstName: '',
    lastName: '',
    email: user?.email ?? '',
    phone: '',
    primaryGoal: '',
    primaryChallenge: '',
  });
  const [savedProfileSnapshot, setSavedProfileSnapshot] = useState<ProfileAnalyticsSnapshot>(
    EMPTY_PROFILE_ANALYTICS_SNAPSHOT,
  );
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');

  useEffect(() => {
    const nextSnapshot: ProfileAnalyticsSnapshot = {
      firstName: profileResponse?.profile?.first_name ?? '',
      lastName: profileResponse?.profile?.last_name ?? '',
      email: user?.email ?? '',
      phone: profileResponse?.profile?.phone_number ?? '',
      primaryGoal: profileResponse?.profile?.primary_goal ?? '',
      primaryChallenge: profileResponse?.profile?.primary_challenge ?? '',
    };

    setSavedProfileSnapshot(nextSnapshot);
    setFormData(nextSnapshot);
  }, [profileResponse, user?.email]);

  useEffect(() => {
    if (userSkillsData) {
      setSelectedSkillIds(userSkillsData.map((item) => item.skillId));
    }
  }, [userSkillsData]);

  const allSkills: SkillRecord[] = useMemo(() => skillsData ?? [], [skillsData]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSkill = async (skillId: string) => {
    if (!selectedSkillIds.includes(skillId)) {
      setSelectedSkillIds((prev) => [...prev, skillId]);
      try {
        await addUserSkillMutation.mutateAsync(skillId);
      } catch (error) {
        setSelectedSkillIds((prev) => prev.filter((id) => id !== skillId));
        toast({
          title: 'Error',
          description: 'Failed to add skill. Please try again.',
          variant: 'destructive',
        });
      }
      return;
    }

    setSelectedSkillIds((prev) => prev.filter((id) => id !== skillId));
    try {
      await removeUserSkillMutation.mutateAsync(skillId);
    } catch (error) {
      setSelectedSkillIds((prev) => [...prev, skillId]);
      toast({
        title: 'Error',
        description: 'Failed to remove skill. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const addCustomSkill = async () => {
    const validation = validateAndSanitizeSkillName(customSkill);

    if (!validation.isValid || !validation.sanitizedValue) {
      toast({
        title: 'Invalid skill name',
        description: validation.error ?? 'Please enter a valid skill name.',
        variant: 'destructive',
      });
      return;
    }

    const sanitized = validation.sanitizedValue;

    try {
      const result = await createSkillMutation.mutateAsync({ name: sanitized });
      if ('success' in result && result.success && result.skill) {
        await addUserSkillMutation.mutateAsync(result.skill.id);
        setSelectedSkillIds((prev) => [...prev, result.skill.id]);
        toast({
          title: 'Skill added',
          description: `"${sanitized}" added to your skills.`,
        });
        setCustomSkill('');
      } else {
        throw new Error(
          (result as { error?: { message?: string } }).error?.message ?? 'Unable to add skill.',
        );
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to add custom skill. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phone,
        primary_goal: formData.primaryGoal,
        primary_challenge: formData.primaryChallenge,
      });

      const currentProfileSnapshot: ProfileAnalyticsSnapshot = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        primaryGoal: formData.primaryGoal,
        primaryChallenge: formData.primaryChallenge,
      };
      const fieldsUpdated = getUpdatedProfileFields(savedProfileSnapshot, currentProfileSnapshot);
      const profileCompletion = getProfileCompletion(currentProfileSnapshot);

      if (fieldsUpdated) {
        trackProfileUpdated({
          fieldsUpdated,
          profileCompletion,
        });
      }
      setSavedProfileSnapshot(currentProfileSnapshot);

      toast({
        title: 'Profile updated',
        description: 'Your profile information has been saved.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const isLoading = profileLoading || skillsLoading || userSkillsLoading;

  return (
    <ProtectedRoute>
      <AppLayout variant="member">
        <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8">
          {/* Hero Header */}
          <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-white/95 p-6 sm:p-8 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#d5ffe9]/10 via-transparent to-[#f4fff9]/5" />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62] to-[#29cf9f] text-white shadow-lg">
                <Edit className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">
                  My Profile
                </h1>
                <p className="text-sm sm:text-base text-neutral-600 mt-0.5">
                  Update your personal details and highlight the skills you&apos;re focused on.
                </p>
              </div>
            </div>
          </div>

          <Card className="rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <CardHeader className="p-5 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-5 pt-0 sm:p-6 sm:pt-0">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading your profile…</p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor={firstNameId}>First Name</Label>
                    <Input
                      id={firstNameId}
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Enter your first name"
                    />
                  </div>

                  <div>
                    <Label htmlFor={lastNameId}>Last Name</Label>
                    <Input
                      id={lastNameId}
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter your last name"
                    />
                  </div>

                  <div>
                    <Label htmlFor={emailId}>Email</Label>
                    <Input id={emailId} name="email" value={formData.email} disabled />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Email updates coming soon. Contact support if you need to change this.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor={phoneId}>Phone Number</Label>
                    <Input
                      id={phoneId}
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g. +971 50 123 4567"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor={goalId}>Primary Goal</Label>
                    <Textarea
                      id={goalId}
                      name="primaryGoal"
                      value={formData.primaryGoal}
                      onChange={handleInputChange}
                      placeholder="Tell us what you want to achieve over the next 6-12 months."
                      rows={3}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor={challengeId}>Primary Challenge</Label>
                    <Textarea
                      id={challengeId}
                      name="primaryChallenge"
                      value={formData.primaryChallenge}
                      onChange={handleInputChange}
                      placeholder="What is the biggest marketing challenge you face right now?"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-6 py-3 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <CardHeader className="flex flex-col gap-2 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62] to-[#29cf9f] text-white shadow-lg">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <CardTitle className="text-lg sm:text-xl text-neutral-900">Skills Focus</CardTitle>
              </div>
              <p className="text-sm text-neutral-600 ml-0 sm:ml-[60px]">
                Highlight the skills you&apos;re actively developing to unlock relevant events and
                resources.
              </p>
            </CardHeader>
            <CardContent className="space-y-6 p-5 pt-0 sm:p-6 sm:pt-0">
              {skillsLoading ? (
                <p className="text-sm text-muted-foreground">Loading available skills…</p>
              ) : allSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No skills available yet. Add your first skill below.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {allSkills.map((skill) => {
                    const checked = selectedSkillIds.includes(skill.id);
                    const checkboxId = `skill-${skill.id}`;
                    return (
                      <label
                        key={skill.id}
                        htmlFor={checkboxId}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-lg ${
                          checked
                            ? 'border-[#05ef62]/40 bg-gradient-to-br from-[#d5ffe9]/20 to-[#f4fff9]/10 shadow-md'
                            : 'border-neutral-200 bg-white/80 backdrop-blur hover:border-neutral-300'
                        }`}
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={checked}
                          onCheckedChange={() => toggleSkill(skill.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-neutral-900">{skill.name}</span>
                            {checked && (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62] to-[#29cf9f]">
                                <Sparkles className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          {skill.category && (
                            <Badge
                              variant="outline"
                              className={`ml-2 mt-1 ${
                                checked
                                  ? 'border-[#05ef62]/60 bg-[#05ef62]/10 text-[#05ef62]'
                                  : 'border-neutral-200 bg-neutral-50'
                              }`}
                            >
                              {skill.category}
                            </Badge>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#05ef62] to-[#29cf9f] text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-900">Add a custom skill</h3>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={customSkill}
                    onChange={(event) => setCustomSkill(event.target.value)}
                    placeholder="e.g. Arabic copywriting"
                    disabled={createSkillMutation.isPending}
                    className="rounded-xl border-neutral-200 bg-white/70 backdrop-blur"
                  />
                  <Button
                    type="button"
                    onClick={addCustomSkill}
                    disabled={createSkillMutation.isPending || !customSkill.trim()}
                    className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-4 py-2 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                  >
                    {createSkillMutation.isPending ? 'Adding…' : 'Add Skill'}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-neutral-600">
                  We&apos;ll create this skill for the community and automatically add it to your
                  profile.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default Dashboard;
