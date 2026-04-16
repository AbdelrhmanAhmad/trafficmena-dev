import type React from 'react';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackSignUpStep } from '@/lib/analytics/events';
import SignUpLayout, { useSignUpContext } from '@/shared/components/layout/SignUpLayout';
import { Button } from '@/shared/components/ui/button';

const Step4: React.FC = () => {
  const navigate = useNavigate();
  const { formData, updateFormData } = useSignUpContext();
  const [primaryGoal, setPrimaryGoal] = useState(formData.primaryGoal);
  const goalGroupId = useId();

  const goalOptions = [
    'Find my first job in marketing',
    'Get promoted to a senior or lead role',
    'Master a new marketing skill',
    'Network with other top-tier professionals',
    'Grow my own business / freelance clients',
  ];

  const handleNext = () => {
    updateFormData({ primaryGoal });
    trackSignUpStep(5, 'goal_selected');
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
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Step 4
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">
            What is your #1 career goal right now?
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            This helps us match you with the right people and opportunities.
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-neutral-700">Primary Goal *</legend>
          {goalOptions.map((option, index) => {
            const optionId = `${goalGroupId}-${index}`;
            const isSelected = primaryGoal === option;
            return (
              <label
                key={option}
                htmlFor={optionId}
                className={`flex cursor-pointer items-center rounded-xl border p-3 transition-colors ${
                  isSelected
                    ? 'border-[#05ef62] bg-[#05ef62]/10'
                    : 'border-neutral-200 hover:border-[#05ef62]/60'
                }`}
              >
                <input
                  id={optionId}
                  type="radio"
                  name={goalGroupId}
                  checked={isSelected}
                  onChange={() => setPrimaryGoal(option)}
                  className="mr-3"
                />
                <span>{option}</span>
              </label>
            );
          })}
        </fieldset>

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            className="rounded-xl border-neutral-200 px-8 py-3 text-neutral-700 hover:bg-neutral-50"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isValid}
            className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-8 py-3 font-semibold text-[#101010] shadow hover:brightness-95"
          >
            Next
          </Button>
        </div>
      </div>
    </SignUpLayout>
  );
};

export default Step4;
