import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { User, Briefcase, MapPin, Calendar, Edit, X } from 'lucide-react';
import { validateAndSanitizeSkillName } from '@/utils/inputSanitization';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    company: '',
    jobRole: '',
    location: '',
    industry: '',
    yearsExperience: 0,
    linkedinUrl: '',
    twitterUrl: '',
    facebookUrl: '',
    instagramUrl: '',
  });
  const [experienceLevel, setExperienceLevel] = useState<string>('');
  const [skills, setSkills] = useState<{ id: string; name: string; category: string }[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle(); // Use maybeSingle to handle missing profiles safely

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load profile data.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setFormData({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: user?.email || '',
          phone: data.phone_number || '',
          bio: data.bio || '',
          company: data.company || '',
          jobRole: data.job_role || '',
          location: data.location || '',
          industry: data.industry || '',
          yearsExperience: data.years_experience || 0,
          linkedinUrl: data.linkedin_url || '',
          twitterUrl: data.twitter_url || '',
          facebookUrl: data.facebook_url || '',
          instagramUrl: data.instagram_url || '',
        });
        setExperienceLevel(data.experience_level || '');
      } else {
        // If no profile exists, use email from auth
        setFormData(prev => ({
          ...prev,
          email: user?.email || '',
        }));
      }

      // Load skills and selections after profile
      await loadSkills();
    } catch (error) {
      console.error('Unexpected error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSkills = async () => {
    if (!user) return;
    try {
      const [{ data: allSkills }, { data: userSkillRows }] = await Promise.all([
        supabase.from('skills').select('id, name, category').order('name', { ascending: true }),
        supabase.from('user_skills').select('skill_id').eq('user_id', user.id),
      ]);
      setSkills(allSkills || []);
      setSelectedSkillIds((userSkillRows || []).map((r) => r.skill_id));
    } catch (e) {
      console.error('Error loading skills', e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleSkill = async (skillId: string) => {
    if (!user) return;
    
    try {
      if (selectedSkillIds.includes(skillId)) {
        // Remove skill
        await supabase
          .from('user_skills')
          .delete()
          .eq('user_id', user.id)
          .eq('skill_id', skillId);
        
        setSelectedSkillIds(prev => prev.filter(id => id !== skillId));
      } else {
        // Add skill
        await supabase
          .from('user_skills')
          .insert({
            user_id: user.id,
            skill_id: skillId,
          });
        
        setSelectedSkillIds(prev => [...prev, skillId]);
      }
    } catch (error) {
      console.error('Error updating skills:', error);
      toast({
        title: "Error",
        description: "Failed to update skills.",
        variant: "destructive",
      });
    }
  };

  const addCustomSkill = async () => {
    if (!user) return;

    // Validate and sanitize the input
    const validation = validateAndSanitizeSkillName(customSkill);
    
    if (!validation.isValid) {
      toast({
        title: "Invalid skill name",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    const sanitizedSkillName = validation.sanitizedValue!;

    try {
      // Check for duplicate skills (case-insensitive)
      const { data: existingSkills } = await supabase
        .from('skills')
        .select('name')
        .ilike('name', sanitizedSkillName);

      if (existingSkills && existingSkills.length > 0) {
        toast({
          title: "Skill already exists",
          description: "This skill is already in the database.",
          variant: "destructive"
        });
        return;
      }

      const { data: newSkill, error } = await supabase
        .from('skills')
        .insert({
          name: sanitizedSkillName,
          category: 'Custom',
        })
        .select()
        .single();

      if (error) throw error;

      // Add to skills list and select it
      setSkills(prev => [...prev, newSkill]);
      await toggleSkill(newSkill.id);
      setCustomSkill('');
      
      toast({
        title: "Success",
        description: `Custom skill "${sanitizedSkillName}" added successfully!`,
      });
    } catch (error) {
      console.error('Error adding custom skill:', error);
      toast({
        title: "Error",
        description: "Failed to add custom skill. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Use the secure update_profile_safe function instead of direct upsert
      const { data, error } = await supabase.rpc('update_profile_safe', {
        user_uuid: user.id,
        new_first_name: formData.firstName,
        new_last_name: formData.lastName,
        new_phone_number: formData.phone,
      });

      if (error) {
        console.error('Profile update error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to save profile changes.",
          variant: "destructive",
        });
        return;
      }

      // For fields not covered by update_profile_safe, use regular update with proper authorization
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          bio: formData.bio,
          company: formData.company,
          job_role: formData.jobRole,
          location: formData.location,
          industry: formData.industry,
          years_experience: formData.yearsExperience,
          linkedin_url: formData.linkedinUrl,
          twitter_url: formData.twitterUrl,
          facebook_url: formData.facebookUrl,
          instagram_url: formData.instagramUrl,
          experience_level: experienceLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id); // Only update the authenticated user's own profile

      if (updateError) {
        console.error('Additional profile fields update error:', updateError);
        toast({
          title: "Error",
          description: "Failed to save some profile changes.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error) {
      console.error('Unexpected error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile changes.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl space-y-6">
          <div className="flex items-center gap-3 mb-8">
            <User className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Edit Profile</h1>
          </div>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter your first name"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter your last name"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    disabled={true}
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed from this form</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself..."
                  disabled={saving}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Your company name"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobRole">Job Role</Label>
                  <Input
                    id="jobRole"
                    name="jobRole"
                    type="text"
                    value={formData.jobRole}
                    onChange={handleInputChange}
                    placeholder="Your job title"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    name="industry"
                    type="text"
                    value={formData.industry}
                    onChange={handleInputChange}
                    placeholder="Your industry"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearsExperience">Years of Experience</Label>
                  <Input
                    id="yearsExperience"
                    name="yearsExperience"
                    type="number"
                    value={formData.yearsExperience}
                    onChange={handleInputChange}
                    placeholder="0"
                    disabled={saving}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Experience Level</Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel} disabled={saving}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                      <SelectItem value="advanced">Advanced (5-10 years)</SelectItem>
                      <SelectItem value="expert">Expert (10+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Your location"
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills & Expertise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selected Skills */}
              {selectedSkillIds.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Skills</Label>
                  <div className="flex flex-wrap gap-2">
                    {skills
                      .filter(skill => selectedSkillIds.includes(skill.id))
                      .map(skill => (
                        <Badge key={skill.id} variant="secondary" className="flex items-center gap-1">
                          {skill.name}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => toggleSkill(skill.id)}
                          />
                        </Badge>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Available Skills */}
              <div className="space-y-2">
                <Label>Available Skills</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                  {skills
                    .filter(skill => !selectedSkillIds.includes(skill.id))
                    .map(skill => (
                      <div key={skill.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={skill.id}
                          checked={selectedSkillIds.includes(skill.id)}
                          onCheckedChange={() => toggleSkill(skill.id)}
                        />
                        <Label 
                          htmlFor={skill.id} 
                          className="text-sm cursor-pointer"
                        >
                          {skill.name}
                        </Label>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Add Custom Skill */}
              <div className="space-y-2">
                <Label>Add Custom Skill</Label>
                <div className="flex gap-2">
                  <Input
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    placeholder="Enter a skill name"
                    onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                  />
                  <Button onClick={addCustomSkill} disabled={!customSkill.trim()}>
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle>Social Media Profiles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input
                    id="linkedinUrl"
                    name="linkedinUrl"
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/in/username"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitterUrl">Twitter/X URL</Label>
                  <Input
                    id="twitterUrl"
                    name="twitterUrl"
                    type="url"
                    value={formData.twitterUrl}
                    onChange={handleInputChange}
                    placeholder="https://twitter.com/username"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebookUrl">Facebook URL</Label>
                  <Input
                    id="facebookUrl"
                    name="facebookUrl"
                    type="url"
                    value={formData.facebookUrl}
                    onChange={handleInputChange}
                    placeholder="https://facebook.com/username"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagramUrl">Instagram URL</Label>
                  <Input
                    id="instagramUrl"
                    name="instagramUrl"
                    type="url"
                    value={formData.instagramUrl}
                    onChange={handleInputChange}
                    placeholder="https://instagram.com/username"
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveChanges} 
              disabled={saving}
              size="lg"
            >
              {saving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default Dashboard;
