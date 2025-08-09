import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import Header from '@/components/Header';

const CheckEmail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="py-16">
        <div className="container mx-auto px-4 max-w-md">
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-primary-green/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary-green" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-primary mb-4">
              Check your email
            </h1>
            
            <p className="text-gray-600 mb-6">
              We've sent a login link to{' '}
              <span className="font-medium text-primary">{email}</span>
            </p>
            
            <p className="text-sm text-gray-500 mb-8">
              Click the link in the email to continue your registration. 
              The link will expire in 1 hour for security.
            </p>

            <div className="space-y-4">
              <Button
                onClick={() => navigate('/signup/step-2')}
                variant="outline"
                className="w-full"
              >
                Back to Login Options
              </Button>
              
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-gradient-to-r from-primary-green to-primary-gradient hover:from-primary-gradient hover:to-secondary-teal text-white"
              >
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckEmail;