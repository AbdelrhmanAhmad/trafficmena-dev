
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const DashboardSubscription: React.FC = () => {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Subscription</h1>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">Free Plan</p>
                    <p className="text-gray-600">Basic access to community features</p>
                  </div>
                  <Button variant="outline">
                    Upgrade Plan
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscription History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  No subscription history available.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default DashboardSubscription;
