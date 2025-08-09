
import React from 'react';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import AdminLayout from '@/components/AdminLayout';

const AdminDashboard: React.FC = () => {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome to the TrafficMENA admin panel. Use the navigation on the left to manage different aspects of the platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-primary mb-2">Quick Stats</h3>
              <p className="text-gray-600">Dashboard overview coming soon...</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-primary mb-2">Recent Activity</h3>
              <p className="text-gray-600">Activity feed coming soon...</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-primary mb-2">System Status</h3>
              <p className="text-gray-600">System monitoring coming soon...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminDashboard;
