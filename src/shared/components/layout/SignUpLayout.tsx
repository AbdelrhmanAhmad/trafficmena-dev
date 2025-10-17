import { ChevronLeft } from 'lucide-react';
import type React from 'react';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/shared/components/layout/Header';
import { Button } from '@/shared/components/ui/button';
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from '@/shared/utils/localStorage';

/**
 * Bug #16 Fix: Comprehensive TypeScript interface documentation
 * Defines the structure for multi-step sign-up form data
 */
export interface SignUpFormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  password: string;
  primaryGoal: string;
  primaryChallenge: string;
  loginMethod?: 'magic' | 'password';
  invitationToken?: string; // Added for invitation acceptance
  invitationUserId?: string;
}

/**
 * Context interface for managing sign-up form state across multiple steps
 */
interface SignUpContextType {
  formData: SignUpFormData;
  updateFormData: (data: Partial<SignUpFormData>) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

// Create context
const SignUpContext = createContext<SignUpContextType | undefined>(undefined);

// LocalStorage key for form data persistence
const FORM_DATA_KEY = 'signup_form_data';
const CURRENT_STEP_KEY = 'signup_current_step';

// Custom hook to use the context
export const useSignUpContext = () => {
  const context = useContext(SignUpContext);
  if (!context) {
    throw new Error('useSignUpContext must be used within SignUpProvider');
  }
  return context;
};

/**
 * Props interface for the SignUpLayout component
 */
interface SignUpLayoutProps {
  children: ReactNode;
  currentStep: number;
  totalSteps?: number;
  onBack?: () => void;
  showBackButton?: boolean;
}

const SignUpLayout: React.FC<SignUpLayoutProps> = ({
  children,
  currentStep,
  totalSteps = 5,
  onBack,
  showBackButton = true,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (currentStep > 1) {
      navigate(`/signup/step-${currentStep - 1}`);
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Add Header Navigation */}
      <Header />

      <div className="py-8">
        <div className="container mx-auto max-w-2xl px-4">
          {/* Header with Back Button */}
          <div className="mb-8 flex items-center">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-4 hover:bg-gray-100"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary">Join TrafficMENA</h1>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round((currentStep / totalSteps) * 100)}% Complete
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-primary-green to-primary-gradient transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Content */}
          <div className="rounded-lg border bg-white p-8 shadow-sm">{children}</div>
        </div>
      </div>
    </div>
  );
};

// Bug #12 Fix: Provider component with improved localStorage error handling
export const SignUpProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load initial form data from localStorage with error handling
  const getInitialFormData = (): SignUpFormData => {
    const result = getLocalStorageItem<SignUpFormData>(FORM_DATA_KEY);

    if (result.success && result.data) {
      return result.data;
    }

    // Return default values if localStorage fails
    return {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      email: '',
      password: '',
      primaryGoal: '',
      primaryChallenge: '',
      loginMethod: undefined,
      invitationUserId: undefined,
    };
  };

  // Load initial step from localStorage with error handling
  const getInitialStep = (): number => {
    const result = getLocalStorageItem<number>(CURRENT_STEP_KEY, 1);

    if (result.success && result.data !== undefined) {
      return result.data;
    }

    return 1;
  };

  const [formData, setFormData] = useState<SignUpFormData>(getInitialFormData);
  const [currentStep, setCurrentStep] = useState(getInitialStep);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    const result = setLocalStorageItem(FORM_DATA_KEY, formData);
    if (!result.success && result.error) {
      // Silently handle localStorage errors - the app should continue to work
    }
  }, [formData]);

  // Save current step to localStorage whenever it changes
  useEffect(() => {
    const result = setLocalStorageItem(CURRENT_STEP_KEY, currentStep);
    if (!result.success && result.error) {
      // Silently handle localStorage errors
    }
  }, [currentStep]);

  const updateFormData = (data: Partial<SignUpFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  // Clear localStorage on successful completion
  const clearFormData = () => {
    removeLocalStorageItem(FORM_DATA_KEY);
    removeLocalStorageItem(CURRENT_STEP_KEY);
  };

  return (
    <SignUpContext.Provider
      value={{
        formData,
        updateFormData,
        currentStep,
        setCurrentStep,
      }}
    >
      {children}
    </SignUpContext.Provider>
  );
};

export default SignUpLayout;
