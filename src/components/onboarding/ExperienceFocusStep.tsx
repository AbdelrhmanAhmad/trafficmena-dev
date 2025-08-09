import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ExperienceFocusStepProps {
  onComplete: () => void;
  onClose: () => void;
  userProfile: any;
}

const ExperienceFocusStep: React.FC<ExperienceFocusStepProps> = ({ 
  onComplete, 
  onClose, 
  userProfile 
}) => {
  const { user } = useAuth();
  const [yearsExperience, setYearsExperience] = useState<number[]>([0]);
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const industries = [
    'E-commerce',
    'SaaS/Technology',
    'Healthcare',
    'Finance/Banking',
    'Education',
    'Real Estate',
    'Travel & Tourism',
    'Food & Beverage',
    'Fashion & Beauty',
    'Automotive',
    'Entertainment & Media',
    'Non-profit',
    'Government',
    'Consulting',
    'Manufacturing',
    'Retail',
    'Agriculture',
    'Energy',
    'Telecommunications',
    'Other'
  ];

  useEffect(() => {
    if (userProfile) {
      setYearsExperience([userProfile.years_experience || 0]);
      setIndustry(userProfile.industry || '');
      setLocation(userProfile.location || '');
    }
  }, [userProfile]);

  const getExperienceLabel = (years: number) => {
    if (years === 0) return 'Just starting out';
    if (years === 1) return '1 year';
    if (years < 10) return `${years} years`;
    if (years === 10) return '10+ years';
    return '10+ years';
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData: any = {
        years_experience: yearsExperience[0],
        industry: industry || null,
        location: location.trim() || null
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: "Experience saved",
        description: "Your professional experience has been saved."
      });

      onComplete();
    } catch (error) {
      console.error('Error saving experience:', error);
      toast({
        title: "Error",
        description: "Failed to save your experience information.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Experience & Focus</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Help us understand your professional background (Optional)
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Years of Experience */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Years of Experience</Label>
            <div className="space-y-3">
              <Slider
                value={yearsExperience}
                onValueChange={setYearsExperience}
                max={10}
                min={0}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Just starting</span>
                <span>10+ years</span>
              </div>
              <div className="text-center">
                <span className="text-lg font-medium text-primary">
                  {getExperienceLabel(yearsExperience[0])}
                </span>
              </div>
            </div>
          </div>

          {/* Industry Focus */}
          <div className="space-y-2">
            <Label htmlFor="industry">
              Industry Focus <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Select your primary industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">
              Location/City <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="location"
              placeholder="e.g., Dubai, UAE or Cairo, Egypt"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Help others find marketers in their region
            </p>
          </div>

          {/* Summary */}
          {(yearsExperience[0] > 0 || industry || location) && (
            <div className="border rounded-lg p-4 bg-muted/20">
              <p className="text-sm font-medium mb-2">Your Profile Summary:</p>
              <div className="space-y-1 text-sm">
                {yearsExperience[0] > 0 && (
                  <p>• <strong>Experience:</strong> {getExperienceLabel(yearsExperience[0])}</p>
                )}
                {industry && (
                  <p>• <strong>Industry:</strong> {industry}</p>
                )}
                {location && (
                  <p>• <strong>Location:</strong> {location}</p>
                )}
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
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Experience'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ExperienceFocusStep;