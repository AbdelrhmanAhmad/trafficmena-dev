
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DashboardMeetups: React.FC = () => {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Meetups</h1>

          <Card>
            <CardHeader>
              <CardTitle>Registered Meetups</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                You haven't registered for any meetups yet. Visit the meetups page to find events to attend.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default DashboardMeetups;
