import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { X, Linkedin, Twitter, Facebook, Instagram } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

interface SocialPresenceStepProps {
  onComplete: () => void;
  onClose: () => void;
  userProfile: any;
}

const SocialPresenceStep: React.FC<SocialPresenceStepProps> = ({ onComplete, onClose, userProfile }) => {
  const { user } = useAuth();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [socialUrl, setSocialUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const socialPlatforms = [
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      placeholder: 'https://linkedin.com/in/your-profile',
      prefix: 'https://linkedin.com/in/',
      recommended: true
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: Twitter,
      placeholder: 'https://twitter.com/your-handle',
      prefix: 'https://twitter.com/'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      placeholder: 'https://facebook.com/your-profile',
      prefix: 'https://facebook.com/'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      placeholder: 'https://instagram.com/your-handle',
      prefix: 'https://instagram.com/'
    }
  ];

  useEffect(() => {
    // Pre-populate if user already has social URLs
    if (userProfile) {
      if (userProfile.linkedin_url) {
        setSelectedPlatform('linkedin');
        setSocialUrl(userProfile.linkedin_url);
      } else if (userProfile.twitter_url) {
        setSelectedPlatform('twitter');
        setSocialUrl(userProfile.twitter_url);
      } else if (userProfile.facebook_url) {
        setSelectedPlatform('facebook');
        setSocialUrl(userProfile.facebook_url);
      } else if (userProfile.instagram_url) {
        setSelectedPlatform('instagram');
        setSocialUrl(userProfile.instagram_url);
      }
    }
  }, [userProfile]);

  const validateUrl = (url: string, platform: string): boolean => {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      
      switch (platform) {
        case 'linkedin':
          return domain.includes('linkedin.com');
        case 'twitter':
          return domain.includes('twitter.com') || domain.includes('x.com');
        case 'facebook':
          return domain.includes('facebook.com');
        case 'instagram':
          return domain.includes('instagram.com');
        default:
          return false;
      }
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!selectedPlatform || !socialUrl.trim()) {
      toast({
        title: "Social profile required",
        description: "Please select a platform and enter your profile URL.",
        variant: "destructive"
      });
      return;
    }

    if (!validateUrl(socialUrl, selectedPlatform)) {
      toast({
        title: "Invalid URL",
        description: `Please enter a valid ${socialPlatforms.find(p => p.id === selectedPlatform)?.name} URL.`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        social_completed: true
      };

      // Clear all social URLs first
      updateData.linkedin_url = null;
      updateData.twitter_url = null;
      updateData.facebook_url = null;
      updateData.instagram_url = null;

      // Set the selected platform URL
      updateData[`${selectedPlatform}_url`] = socialUrl;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: "Social profile saved",
        description: `Your ${socialPlatforms.find(p => p.id === selectedPlatform)?.name} profile has been added.`
      });

      onComplete();
    } catch (error) {
      console.error('Error saving social profile:', error);
      toast({
        title: "Error",
        description: "Failed to save your social profile.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPlatformData = socialPlatforms.find(p => p.id === selectedPlatform);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Add Social Profile</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Connect with the community through your professional profile
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Platform Selection */}
          <div>
            <Label className="text-base font-medium">Choose Platform</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select one platform to showcase your professional presence
            </p>
            <RadioGroup value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <div className="space-y-2">
                {socialPlatforms.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <div key={platform.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                      <RadioGroupItem value={platform.id} id={platform.id} />
                      <Icon className="h-5 w-5" />
                      <div className="flex-1">
                        <Label htmlFor={platform.id} className="cursor-pointer flex items-center gap-2">
                          {platform.name}
                          {platform.recommended && (
                            <span className="text-xs bg-primary-green/10 text-primary-green px-2 py-1 rounded">
                              Recommended
                            </span>
                          )}
                        </Label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* URL Input */}
          {selectedPlatform && (
            <div className="space-y-2">
              <Label htmlFor="social-url">
                Your {selectedPlatformData?.name} Profile URL
              </Label>
              <Input
                id="social-url"
                placeholder={selectedPlatformData?.placeholder}
                value={socialUrl}
                onChange={(e) => setSocialUrl(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter your complete profile URL including https://
              </p>
            </div>
          )}

          {/* Preview */}
          {selectedPlatform && socialUrl && validateUrl(socialUrl, selectedPlatform) && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Preview:</p>
              <div className="flex items-center gap-2">
                {selectedPlatformData && <selectedPlatformData.icon className="h-4 w-4" />}
                <span className="text-sm text-primary underline">{socialUrl}</span>
              </div>
            </div>
          )}
        </CardContent>
        <div className="p-6 border-t bg-muted/20">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {!selectedPlatform || !socialUrl ? (
                <span className="text-orange-600">⚠️ Social profile required</span>
              ) : !validateUrl(socialUrl, selectedPlatform) ? (
                <span className="text-red-600">❌ Invalid URL format</span>
              ) : (
                <span className="text-success">✓ Ready to save</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={loading || !selectedPlatform || !socialUrl || !validateUrl(socialUrl, selectedPlatform)}
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SocialPresenceStep;