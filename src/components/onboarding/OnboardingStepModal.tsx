import React from 'react';
import SkillsSelectionStep from './SkillsSelectionStep';
import SocialPresenceStep from './SocialPresenceStep';
import ProfessionalIdentityStep from './ProfessionalIdentityStep';
import ExperienceFocusStep from './ExperienceFocusStep';

interface OnboardingStepModalProps {
  step: string;
  onClose: () => void;
  onComplete: () => void;
  userProfile: any;
}

const OnboardingStepModal: React.FC<OnboardingStepModalProps> = ({ 
  step, 
  onClose, 
  onComplete, 
  userProfile 
}) => {
  switch (step) {
    case 'skills':
      return <SkillsSelectionStep onComplete={onComplete} onClose={onClose} />;
    case 'social':
      return <SocialPresenceStep onComplete={onComplete} onClose={onClose} userProfile={userProfile} />;
    case 'profile':
      return <ProfessionalIdentityStep onComplete={onComplete} onClose={onClose} userProfile={userProfile} />;
    case 'experience':
      return <ExperienceFocusStep onComplete={onComplete} onClose={onClose} userProfile={userProfile} />;
    default:
      return null;
  }
};

export default OnboardingStepModal;