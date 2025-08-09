
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DashboardLibrary: React.FC = () => {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Library</h1>

          <Card>
            <CardHeader>
              <CardTitle>Downloaded Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Your downloaded resources and purchased content will appear here.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default DashboardLibrary;
