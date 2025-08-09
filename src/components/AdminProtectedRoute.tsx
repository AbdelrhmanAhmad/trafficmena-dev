
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 2;
    
    const checkAdminStatus = async () => {
      if (!user) {
        if (isMounted) {
          navigate('/signin');
        }
        return;
      }

      const attemptAdminCheck = async (): Promise<boolean> => {
        try {
          const { data: isAdminResult, error } = await supabase.rpc('is_admin');

          if (error) {
            console.error('Admin check error:', error);
            
            // For explicit permission errors, immediately deny access
            if (error.code === 'PGRST202' || error.message?.includes('permission') || error.message?.includes('denied')) {
              return false;
            }
            
            // For network/system errors, allow limited retry
            if (retryCount < maxRetries) {
              retryCount++;
              console.warn(`Admin check failed, retrying... (${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              return attemptAdminCheck();
            }
            
            // Max retries exceeded - deny access for security
            console.error('Admin check failed after retries - denying access');
            return false;
          }

          // Explicitly validate boolean response
          return Boolean(isAdminResult);
        } catch (error) {
          console.error('Unexpected admin check error:', error);
          
          // Allow retry on unexpected errors
          if (retryCount < maxRetries) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            return attemptAdminCheck();
          }
          
          // Default to deny access for security
          return false;
        }
      };

      try {
        const adminResult = await attemptAdminCheck();
        
        if (!isMounted) return;
        
        if (adminResult) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Final error in admin route check:', error);
        if (isMounted) {
          setIsAdmin(false);
          navigate('/dashboard');
        }
      }
    };

    if (!loading) {
      checkAdminStatus();
    }
    
    return () => {
      isMounted = false;
    };
  }, [user, loading, navigate]);

  // Show loading spinner while checking authentication and admin status
  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated or not admin, return null (redirect will happen in useEffect)
  if (!user || !isAdmin) {
    return null;
  }

  // If user is authenticated and is admin, render the protected content
  return <>{children}</>;
};

export default AdminProtectedRoute;
