import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useIsAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const attemptCheck = async (): Promise<boolean> => {
        try {
          const { data, error } = await supabase.rpc('is_admin');
          
          if (error) {
            console.error('Error checking admin status:', error);
            
            // For specific permission errors, immediately return false
            if (error.code === 'PGRST202' || error.message?.includes('permission') || error.message?.includes('denied')) {
              return false;
            }
            
            // For network/system errors, allow retry
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = baseDelay * Math.pow(2, retryCount - 1); // Exponential backoff
              console.warn(`Admin check failed, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
              
              await new Promise(resolve => setTimeout(resolve, delay));
              return attemptCheck();
            }
            
            // Max retries exceeded - default to false for security
            console.error('Max retries exceeded for admin check - defaulting to non-admin');
            return false;
          }
          
          // Explicitly validate the response
          return Boolean(data);
        } catch (error) {
          console.error('Unexpected error in admin check:', error);
          
          // Retry on unexpected errors
          if (retryCount < maxRetries) {
            retryCount++;
            const delay = baseDelay * Math.pow(2, retryCount - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
            return attemptCheck();
          }
          
          // Default to false for security
          return false;
        }
      };

      try {
        const adminResult = await attemptCheck();
        
        if (isMounted) {
          setIsAdmin(adminResult);
        }
      } catch (error) {
        console.error('Final error in admin status check:', error);
        if (isMounted) {
          setIsAdmin(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAdminStatus();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return { isAdmin, loading };
};