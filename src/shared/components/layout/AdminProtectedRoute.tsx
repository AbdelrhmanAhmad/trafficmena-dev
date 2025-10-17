import type React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { useIsAdmin } from '@/shared/hooks/custom/useIsAdmin';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  // Show loading spinner while checking authentication and admin status
  if (authLoading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user is authenticated and has admin role, render the protected content
  return <>{children}</>;
};

export default AdminProtectedRoute;
