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
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
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
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');

  useEffect(() => {
    if (profileResponse?.profile) {
      setFormData((prev) => ({
        ...prev,
        firstName: profileResponse.profile.first_name ?? '',
        lastName: profileResponse.profile.last_name ?? '',
        email: user?.email ?? '',
        phone: profileResponse.profile.phone_number ?? '',
        primaryGoal: profileResponse.profile.primary_goal ?? '',
        primaryChallenge: profileResponse.profile.primary_challenge ?? '',
      }));
    }
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
      <DashboardLayout>
        <div className="space-y-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-muted-foreground">
              Update your personal details and highlight the skills you&apos;re focused on.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2">
              <CardTitle>Skills Focus</CardTitle>
              <p className="text-sm text-muted-foreground">
                Highlight the skills you&apos;re actively developing to unlock relevant events and
                resources.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
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
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:border-primary"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={checked}
                          onCheckedChange={() => toggleSkill(skill.id)}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-medium text-gray-900">{skill.name}</span>
                          {skill.category && (
                            <Badge variant="outline" className="ml-2">
                              {skill.category}
                            </Badge>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Add a custom skill</h3>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={customSkill}
                    onChange={(event) => setCustomSkill(event.target.value)}
                    placeholder="e.g. Arabic copywriting"
                    disabled={createSkillMutation.isPending}
                  />
                  <Button
                    type="button"
                    onClick={addCustomSkill}
                    disabled={createSkillMutation.isPending || !customSkill.trim()}
                  >
                    {createSkillMutation.isPending ? 'Adding…' : 'Add Skill'}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  We&apos;ll create this skill for the community and automatically add it to your
                  profile.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default Dashboard;
