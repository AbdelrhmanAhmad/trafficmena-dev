import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignUpLayout, { useSignUpContext } from '@/shared/components/layout/SignUpLayout';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

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
        <div className="mb-8 text-center">
          <h2 className="mb-4 text-3xl font-bold text-primary">
            What is your #1 career goal right now?
          </h2>
          <p className="text-gray-600">
            This helps us match you with the right people and opportunities.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="goal" className="text-sm font-medium text-gray-700">
              Primary Goal *
            </Label>
            <div className="mt-3 space-y-2">
              {goalOptions.map((option) => (
                <div
                  key={option}
                  className={`flex cursor-pointer items-center rounded-md border p-3 ${primaryGoal === option ? 'border-primary' : 'border-gray-200'}`}
                  onClick={() => setPrimaryGoal(option)}
                >
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
          <Button variant="outline" onClick={handleBack} className="px-8 py-3">
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isValid}
            className="rounded-lg bg-gradient-to-r from-primary-green to-primary-gradient px-8 py-3 font-semibold text-white transition-all duration-300 hover:from-primary-gradient hover:to-secondary-teal"
          >
            Next
          </Button>
        </div>
      </div>
    </SignUpLayout>
  );
};

export default Step4;
