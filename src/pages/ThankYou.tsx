import { ArrowRight, CheckCircle, Mail } from 'lucide-react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';

const ThankYou: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-primary-green" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">Welcome to TrafficMENA!</h1>
            <p className="text-muted-foreground">Your account has been created successfully</p>
          </div>

          <div className="mb-6 rounded-lg bg-muted/50 p-4">
            <Mail className="mx-auto mb-2 h-8 w-8 text-primary-green" />
            <p className="text-sm text-muted-foreground">
              Please check your email to verify your account and complete the setup process.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              asChild
              className="w-full bg-gradient-to-r from-primary-green to-primary-gradient hover:from-primary-gradient hover:to-secondary-teal"
            >
              <Link to="/dashboard" className="flex items-center justify-center">
                Go to Member Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link to="/">Return to Home</Link>
            </Button>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Need help?{' '}
              <Link to="/contact" className="text-primary-green hover:underline">
                Contact our support team
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThankYou;
