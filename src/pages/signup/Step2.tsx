
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SignUpLayout, { useSignUpContext } from '@/components/SignUpLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Step2: React.FC = () => {
  const navigate = useNavigate();
  const { formData, updateFormData } = useSignUpContext();
  const [email, setEmail] = useState(formData.email);
  const [password, setPassword] = useState(formData.password);
  const [loginMethod, setLoginMethod] = useState<'magic' | 'password'>('magic');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // If user is authenticated via Google, get their info and go to Step 3
        const user = session.user;
        if (user) {
          updateFormData({
            email: user.email || '',
            firstName: user.user_metadata?.first_name || '',
            lastName: user.user_metadata?.last_name || ''
          });
          navigate('/signup/step-3');
        }
      }
    };
    checkAuth();
  }, [navigate, updateFormData]);

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (loginMethod === 'magic') return undefined; // No password needed for magic link
    if (!password.trim()) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) return 'Password must contain uppercase and lowercase letters';
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
    return undefined;
  };

  const validateForm = () => {
    const newErrors: {email?: string; password?: string} = {};
    newErrors.email = validateEmail(email);
    newErrors.password = validatePassword(password);
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleNext = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Update form data with login method preference
      updateFormData({ 
        email: email.trim(),
        password: loginMethod === 'password' ? password : '',
        loginMethod: loginMethod
      });

      // For both methods, continue to Step 3 to collect user information first
      navigate('/signup/step-3');
    } catch (error) {
      console.error('Unexpected error:', error);
      setErrors({ email: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    updateFormData({ 
      email: email.trim(),
      password: loginMethod === 'password' ? password : ''
    });
    navigate('/signup/step-1');
  };

  const isValid = email.trim() && !errors.email && 
    (loginMethod === 'magic' || (!errors.password && password.trim())) && 
    !isLoading;

  return (
    <SignUpLayout currentStep={2} onBack={handleBack}>
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-primary mb-4">What's your email?</h2>
          <p className="text-gray-600">Choose your preferred login method</p>
        </div>

        <div className="space-y-6">
          {/* Email Field */}
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors(prev => ({...prev, email: undefined}));
                }
              }}
              placeholder="Enter your email address"
              className={`mt-1 ${errors.email ? 'border-red-500' : ''}`}
              required
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Login Method Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Login method
            </Label>
            <RadioGroup 
              value={loginMethod} 
              onValueChange={(value: 'magic' | 'password') => setLoginMethod(value)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="magic" id="magic" />
                <div className="flex-1">
                  <Label htmlFor="magic" className="font-medium cursor-pointer">
                    ✨ Magic Link (recommended)
                  </Label>
                  <p className="text-sm text-gray-500">A secure, passwordless way to sign in.</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="password" id="password" />
                <div className="flex-1">
                  <Label htmlFor="password" className="font-medium cursor-pointer">
                    🔒 Password
                  </Label>
                  <p className="text-sm text-gray-500">Use a traditional password.</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Password Field (shown only when password method is selected) */}
          {loginMethod === 'password' && (
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password *
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors(prev => ({...prev, password: undefined}));
                  }
                }}
                placeholder="Enter a strong password (min. 8 characters)"
                className={`mt-1 ${errors.password ? 'border-red-500' : ''}`}
                required
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isLoading}
            className="px-8 py-3"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isValid}
            className="bg-gradient-to-r from-primary-green to-primary-gradient hover:from-primary-gradient hover:to-secondary-teal text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </div>
    </SignUpLayout>
  );
};

export default Step2;
