import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/utils/errorHandling';

const SignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        const appError = handleError(error);
        setErrorMessage('Invalid email or password.');
        return;
      }

      // Show success message
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      // Redirect to dashboard
      navigate('/dashboard');
      
    } catch (error) {
      const appError = handleError(error);
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMagicLinkLoading(true);
    setErrorMessage('');

    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email: magicLinkEmail.trim(),
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        const appError = handleError(error);
        setErrorMessage('Failed to send magic link. Please check your email address.');
        return;
      }

      setMagicLinkSent(true);
      toast({
        title: "Magic link sent!",
        description: "Check your email for a sign-in link.",
      });
      
    } catch (error) {
      const appError = handleError(error);
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsMagicLinkLoading(false);
    }
  };

  const isValid = email.trim() && password.trim();
  const isMagicLinkValid = magicLinkEmail.trim();

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-primary mb-4">Welcome Back!</h2>
              <p className="text-gray-600">Sign in to your TrafficMENA account</p>
            </div>

            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
              </TabsList>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm mt-4">
                  {errorMessage}
                </div>
              )}

              <TabsContent value="password" className="space-y-4 mt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="mt-1"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password *
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="mt-1"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <Button
                      type="submit"
                      disabled={!isValid || isLoading}
                      className="w-full bg-gradient-to-r from-primary-green to-primary-gradient hover:from-primary-gradient hover:to-secondary-teal text-white font-semibold py-3 rounded-lg transition-all duration-300"
                    >
                      {isLoading ? 'Signing In...' : 'Sign In'}
                    </Button>
                  </div>

                  <div className="text-center">
                    <a 
                      href="#" 
                      className="text-sm text-primary hover:text-primary-green transition-colors duration-200"
                    >
                      Forgot Password?
                    </a>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="magic-link" className="space-y-4 mt-6">
                {!magicLinkSent ? (
                  <form onSubmit={handleMagicLink} className="space-y-6">
                    <div>
                      <Label htmlFor="magic-email" className="text-sm font-medium text-gray-700">
                        Email Address *
                      </Label>
                      <Input
                        id="magic-email"
                        type="email"
                        value={magicLinkEmail}
                        onChange={(e) => setMagicLinkEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="mt-1"
                        required
                        disabled={isMagicLinkLoading}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        We'll send you a secure link to sign in without a password.
                      </p>
                    </div>

                    <div>
                      <Button
                        type="submit"
                        disabled={!isMagicLinkValid || isMagicLinkLoading}
                        className="w-full bg-gradient-to-r from-primary-green to-primary-gradient hover:from-primary-gradient hover:to-secondary-teal text-white font-semibold py-3 rounded-lg transition-all duration-300"
                      >
                        {isMagicLinkLoading ? 'Sending Link...' : 'Send Magic Link'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
                      <h3 className="font-medium">Check your email!</h3>
                      <p className="text-sm mt-1">
                        We've sent a magic link to <strong>{magicLinkEmail}</strong>
                      </p>
                      <p className="text-sm mt-1">
                        Click the link in your email to sign in securely.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMagicLinkSent(false);
                        setMagicLinkEmail('');
                        setErrorMessage('');
                      }}
                      className="w-full"
                    >
                      Send Another Link
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link 
                  to="/signup/step-1" 
                  className="text-primary hover:text-primary-green font-medium transition-colors duration-200"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SignIn;
