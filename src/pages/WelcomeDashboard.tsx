import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Users, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import OnboardingStepModal from '@/components/onboarding/OnboardingStepModal';

interface OnboardingStatus {
  skillsCompleted: boolean;
  socialCompleted: boolean;
  profileCompleted: boolean;
  experienceCompleted: boolean;
  onboardingCompleted: boolean;
}

const WelcomeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus>({
    skillsCompleted: false,
    socialCompleted: false,
    profileCompleted: false,
    experienceCompleted: false,
    onboardingCompleted: false
  });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadOnboardingStatus();
    }
  }, [user]);

  const loadOnboardingStatus = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      setUserProfile(profile);

      // Check skills completion
      const { data: userSkills, error: skillsError } = await supabase
        .from('user_skills')
        .select('*')
        .eq('user_id', user?.id);

      if (skillsError) throw skillsError;

      const skillsCompleted = userSkills && userSkills.length >= 3;
      const socialCompleted = !!(profile?.linkedin_url || profile?.twitter_url || profile?.facebook_url || profile?.instagram_url);
      const profileCompleted = !!(profile?.bio || profile?.company || profile?.job_role);
      const experienceCompleted = !!(profile?.years_experience || profile?.industry || profile?.location);

      setStatus({
        skillsCompleted,
        socialCompleted,
        profileCompleted,
        experienceCompleted,
        onboardingCompleted: skillsCompleted && socialCompleted
      });

      // Update onboarding completion status in database
      await supabase
        .from('profiles')
        .update({
          skills_completed: skillsCompleted,
          social_completed: socialCompleted,
          onboarding_completed: skillsCompleted && socialCompleted
        })
        .eq('id', user?.id);

    } catch (error) {
      console.error('Error loading onboarding status:', error);
      toast({
        title: "Error",
        description: "Failed to load your onboarding progress.",
        variant: "destructive"
      });
    }
  };

  const getStepIcon = (completed: boolean) => {
    return completed ? (
      <CheckCircle className="h-5 w-5 text-success" />
    ) : (
      <Circle className="h-5 w-5 text-muted-foreground" />
    );
  };

  const getStepClassName = (completed: boolean) => {
    return completed ? "line-through text-muted-foreground" : "";
  };

  const onboardingSteps = [
    {
      id: 'skills',
      title: 'Skills Selection',
      description: 'Choose your marketing expertise (minimum 3 skills)',
      required: true,
      completed: status.skillsCompleted,
      estimated: '2 minutes'
    },
    {
      id: 'social',
      title: 'Social Presence',
      description: 'Add your professional social media profile',
      required: true,
      completed: status.socialCompleted,
      estimated: '30 seconds'
    },
    {
      id: 'profile',
      title: 'Professional Identity',
      description: 'Complete your profile with bio and company info',
      required: false,
      completed: status.profileCompleted,
      estimated: '30 seconds'
    },
    {
      id: 'experience',
      title: 'Experience & Focus',
      description: 'Share your experience level and industry focus',
      required: false,
      completed: status.experienceCompleted,
      estimated: '45 seconds'
    }
  ];

  const completedSteps = onboardingSteps.filter(step => step.completed).length;
  const totalSteps = onboardingSteps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  const canAccessCommunity = status.skillsCompleted && status.socialCompleted;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary-green" />
            <h1 className="text-3xl font-bold">Welcome</h1>
            <Sparkles className="h-8 w-8 text-primary-green" />
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're thrilled to have you join the Middle East's most vibrant digital marketing community. 
            Let's complete your profile so you can connect with industry experts and unlock exclusive content.
          </p>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Onboarding Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm text-muted-foreground">{completedSteps}/{totalSteps} steps</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary-green h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              {!canAccessCommunity && (
                <div className="text-sm text-orange-600 font-medium">
                  ⚠️ Complete required steps to access the community
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {onboardingSteps.map((step, index) => (
                <div 
                  key={step.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStepIcon(step.completed)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium ${getStepClassName(step.completed)}`}>
                          {step.title}
                        </h3>
                        {step.required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <p className={`text-sm text-muted-foreground ${getStepClassName(step.completed)}`}>
                        {step.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ⏱️ {step.estimated}
                      </p>
                    </div>
                  </div>
                  <div>
                    {!step.completed && (
                      <Button 
                        onClick={() => setCurrentStep(step.id)}
                        variant={step.required ? "default" : "outline"}
                        size="sm"
                      >
                        {step.required ? "Complete Now" : "Add Info"}
                      </Button>
                    )}
                    {step.completed && (
                      <Button 
                        onClick={() => setCurrentStep(step.id)}
                        variant="ghost"
                        size="sm"
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {canAccessCommunity && (
          <Card className="border-success">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-success mx-auto" />
                <h3 className="text-lg font-semibold text-success">
                  🎉 Welcome to the Community!
                </h3>
                <p className="text-muted-foreground">
                  You've completed the essential steps. You now have full access to TrafficMENA's community features.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => window.location.href = '/dashboard/meetups'}>
                    Browse Meetups
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/dashboard/library'}>
                    Explore Library
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Step Modal/Component */}
        {currentStep && (
          <OnboardingStepModal 
            step={currentStep}
            onClose={() => setCurrentStep(null)}
            onComplete={loadOnboardingStatus}
            userProfile={userProfile}
          />
        )}
      </div>
    </DashboardLayout>
  );
};


export default WelcomeDashboard;