import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Mail, ArrowRight } from 'lucide-react';

const ThankYou: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 mx-auto text-primary-green mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Welcome to TrafficMENA!
            </h1>
            <p className="text-muted-foreground">
              Your account has been created successfully
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <Mail className="h-8 w-8 mx-auto text-primary-green mb-2" />
            <p className="text-sm text-muted-foreground">
              Please check your email to verify your account and complete the setup process.
            </p>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full bg-gradient-to-r from-primary-green to-primary-gradient hover:from-primary-gradient hover:to-secondary-teal">
              <Link to="/dashboard" className="flex items-center justify-center">
                Go to Member Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link to="/">
                Return to Home
              </Link>
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Need help? <Link to="/contact" className="text-primary-green hover:underline">Contact our support team</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThankYou;