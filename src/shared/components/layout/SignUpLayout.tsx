import { ChevronLeft } from 'lucide-react';
import type React from 'react';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/shared/components/layout/Header';
import { Button } from '@/shared/components/ui/button';
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from '@/shared/utils/localStorage';
import { SIGNUP_TOTAL_STEPS } from './signupSteps';

export { SIGNUP_OTP_STEP, SIGNUP_TOTAL_STEPS } from './signupSteps';

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
  resetForm: () => void;
}

// Create context
const SignUpContext = createContext<SignUpContextType | undefined>(undefined);

// LocalStorage key for form data persistence
export const SIGNUP_FORM_DATA_KEY = 'signup_form_data';
export const SIGNUP_CURRENT_STEP_KEY = 'signup_current_step';

const DEFAULT_FORM_DATA: SignUpFormData = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  email: '',
  password: '',
  primaryGoal: '',
  primaryChallenge: '',
  loginMethod: undefined,
  invitationToken: undefined,
  invitationUserId: undefined,
};

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
  totalSteps = SIGNUP_TOTAL_STEPS,
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
    <div className="relative isolate min-h-screen overflow-hidden bg-neutral-50">
      <Header />

      <div className="pointer-events-none absolute -left-[45vw] top-[-30vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/60 via-[#f4fff9]/40 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -right-[48vw] bottom-[-35vh] -z-10 h-[60vh] w-[82vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[90px]" />

      <div className="relative py-10">
        <div className="mx-auto w-full max-w-2xl px-4">
          <div className="mb-8 flex items-center">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-4 rounded-full border border-neutral-200 bg-white/80 px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-white"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
            <div className="flex-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Become a member
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
                Join TrafficMENA
              </h1>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8 rounded-[20px] border border-neutral-200 bg-white/90 px-5 py-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-neutral-700">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-neutral-500">
                {Math.round((currentStep / totalSteps) * 100)}% Complete
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#05ef62] to-[#29cf9f] transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="rounded-[28px] border border-neutral-200 bg-white/95 p-8 shadow-[0_18px_50px_-20px_rgba(16,16,16,0.35)] backdrop-blur">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Bug #12 Fix: Provider component with improved localStorage error handling
export const SignUpProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load initial form data from localStorage with error handling
  const getInitialFormData = (): SignUpFormData => {
    const result = getLocalStorageItem<SignUpFormData>(SIGNUP_FORM_DATA_KEY);

    if (result.success && result.data) {
      return result.data;
    }

    // Return default values if localStorage fails
    return { ...DEFAULT_FORM_DATA };
  };

  // Load initial step from localStorage with error handling
  const getInitialStep = (): number => {
    const result = getLocalStorageItem<number>(SIGNUP_CURRENT_STEP_KEY, 1);

    if (result.success && result.data !== undefined) {
      return result.data;
    }

    return 1;
  };

  const [formData, setFormData] = useState<SignUpFormData>(getInitialFormData);
  const [currentStep, setCurrentStep] = useState(getInitialStep);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    const result = setLocalStorageItem(SIGNUP_FORM_DATA_KEY, formData);
    if (!result.success && result.error) {
      // Silently handle localStorage errors - the app should continue to work
    }
  }, [formData]);

  // Save current step to localStorage whenever it changes
  useEffect(() => {
    const result = setLocalStorageItem(SIGNUP_CURRENT_STEP_KEY, currentStep);
    if (!result.success && result.error) {
      // Silently handle localStorage errors
    }
  }, [currentStep]);

  const updateFormData = (data: Partial<SignUpFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const resetForm = useCallback(() => {
    setFormData({ ...DEFAULT_FORM_DATA });
    setCurrentStep(1);
    removeLocalStorageItem(SIGNUP_FORM_DATA_KEY);
    removeLocalStorageItem(SIGNUP_CURRENT_STEP_KEY);
  }, []);

  return (
    <SignUpContext.Provider
      value={{
        formData,
        updateFormData,
        currentStep,
        setCurrentStep,
        resetForm,
      }}
    >
      {children}
    </SignUpContext.Provider>
  );
};

export default SignUpLayout;
