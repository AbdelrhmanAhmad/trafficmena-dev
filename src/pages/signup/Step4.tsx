
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignUpLayout, { useSignUpContext } from '@/components/SignUpLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Step4: React.FC = () => {
  const navigate = useNavigate();
  const { formData, updateFormData } = useSignUpContext();
  const [primaryGoal, setPrimaryGoal] = useState(formData.primaryGoal);

  const goalOptions = [
    'Find my first job in marketing',
    'Get promoted to a senior or lead role',
    'Master a new marketing skill',
    'Network with other top-tier professionals',
    'Grow my own business / freelance clients',
  ];

  const handleNext = () => {
    updateFormData({ primaryGoal });
    navigate('/signup/step-5');
  };

  const handleBack = () => {
    updateFormData({ primaryGoal });
    navigate('/signup/step-3');
  };

  const isValid = primaryGoal.trim();

  return (
    <SignUpLayout currentStep={4} onBack={handleBack}>
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-primary mb-4">What is your #1 career goal right now?</h2>
          <p className="text-gray-600">This helps us match you with the right people and opportunities.</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="goal" className="text-sm font-medium text-gray-700">
              Primary Goal *
            </Label>
            <div className="mt-3 space-y-2">
              {goalOptions.map((option) => (
                <div key={option} className={`flex items-center p-3 rounded-md border cursor-pointer ${primaryGoal === option ? 'border-primary' : 'border-gray-200'}`} onClick={() => setPrimaryGoal(option)}>
                  <input
                    type="radio"
                    name="primaryGoal"
                    checked={primaryGoal === option}
                    onChange={() => setPrimaryGoal(option)}
                    className="mr-3"
                  />
                  <span>{option}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            className="px-8 py-3"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isValid}
            className="bg-gradient-to-r from-primary-green to-primary-gradient hover:from-primary-gradient hover:to-secondary-teal text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300"
          >
            Next
          </Button>
        </div>
      </div>
    </SignUpLayout>
  );
};

export default Step4;
