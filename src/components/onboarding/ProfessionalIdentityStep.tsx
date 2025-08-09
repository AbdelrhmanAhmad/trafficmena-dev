import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Upload, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ProfessionalIdentityStepProps {
  onComplete: () => void;
  onClose: () => void;
  userProfile: any;
}

const ProfessionalIdentityStep: React.FC<ProfessionalIdentityStepProps> = ({ 
  onComplete, 
  onClose, 
  userProfile 
}) => {
  const { user } = useAuth();
  const [bio, setBio] = useState('');
  const [company, setCompany] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setBio(userProfile.bio || '');
      setCompany(userProfile.company || '');
      setJobRole(userProfile.job_role || '');
      setAvatarUrl(userProfile.avatar_url || '');
    }
  }, [userProfile]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

      // For now, we'll store the file as a data URL since storage isn't set up
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarUrl(e.target?.result as string);
        setUploading(false);
      };
      reader.readAsDataURL(file);

      toast({
        title: "Image uploaded",
        description: "Your profile picture has been uploaded."
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload your profile picture.",
        variant: "destructive"
      });
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData: any = {
        bio: bio.trim() || null,
        company: company.trim() || null,
        job_role: jobRole.trim() || null,
        avatar_url: avatarUrl || null
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your professional identity has been saved."
      });

      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save your profile information.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const firstName = userProfile?.first_name || '';
    const lastName = userProfile?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Professional Identity</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Complete your professional profile (Optional)
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture Upload */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-lg">
                  {avatarUrl ? null : getInitials() || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Upload className="h-4 w-4" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Profile Picture</p>
              <p className="text-xs text-muted-foreground">
                {uploading ? 'Uploading...' : 'Click the upload icon to change'}
              </p>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">
              Bio/About <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself in a few words..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={150}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/150 characters
            </p>
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="company">
              Current Company <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="company"
              placeholder="e.g., Google, Freelance, My Own Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          {/* Job Role */}
          <div className="space-y-2">
            <Label htmlFor="job-role">
              Current Role <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="job-role"
              placeholder="e.g., Digital Marketing Manager, SEO Specialist"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
            />
          </div>

          {/* Preview Card */}
          {(bio || company || jobRole || avatarUrl) && (
            <div className="border rounded-lg p-4 bg-muted/20">
              <p className="text-sm font-medium mb-2">Profile Preview:</p>
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-sm">
                    {avatarUrl ? null : getInitials() || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {userProfile?.first_name} {userProfile?.last_name}
                  </p>
                  {jobRole && (
                    <p className="text-sm text-muted-foreground">{jobRole}</p>
                  )}
                  {company && (
                    <p className="text-sm text-muted-foreground">at {company}</p>
                  )}
                  {bio && (
                    <p className="text-sm mt-1">{bio}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <div className="p-6 border-t bg-muted/20">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              <span className="text-muted-foreground">Optional step - skip if you prefer</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Skip for Now
              </Button>
              <Button onClick={handleSave} disabled={loading || uploading}>
                {loading ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfessionalIdentityStep;