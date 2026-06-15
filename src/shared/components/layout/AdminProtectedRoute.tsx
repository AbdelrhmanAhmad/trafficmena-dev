import type React from 'react';
import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import {
  getRolePriority,
  type UserRole,
  useRolePermissions,
} from '@/shared/hooks/custom/useRolePermissions';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectPath?: string;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({
  children,
  allowedRoles = ['owner', 'admin'],
  redirectPath = '/dashboard',
}) => {
  const { user, loading: authLoading } = useAuth();
  const { loading: roleLoading, rank } = useRolePermissions();

  const minimumRank = useMemo(() => {
    if (!allowedRoles.length) return getRolePriority('admin');
    return Math.min(...allowedRoles.map((role) => getRolePriority(role)));
  }, [allowedRoles]);

  // Show loading spinner while checking authentication and admin status
  if (authLoading || roleLoading) {
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
  if (rank < minimumRank) {
    return <Navigate to={redirectPath} replace />;
  }

  // If user is authenticated and has admin role, render the protected content
  return <>{children}</>;
};

export default AdminProtectedRoute;
