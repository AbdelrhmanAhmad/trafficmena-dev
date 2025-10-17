import { useEffect, useState } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import { supabase } from '@/shared/integrations/supabase/client';

export const useIsExpert = () => {
  const { user } = useAuth();
  const [isExpert, setIsExpert] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    const checkExpertStatus = async () => {
      if (!user) {
        setIsExpert(false);
        setLoading(false);
        return;
      }

      const attemptCheck = async (): Promise<boolean> => {
        try {
          const { data, error } = await supabase.rpc('is_expert');

          if (error) {
            console.error('Error checking expert status:', error);

            // For specific permission errors, immediately return false
            if (
              error.code === 'PGRST202' ||
              error.message?.includes('permission') ||
              error.message?.includes('denied')
            ) {
              return false;
            }

            // For network/system errors, allow retry
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = baseDelay * 2 ** (retryCount - 1); // Exponential backoff
              console.warn('Expert status check encountered an error, retrying...');

              await new Promise((resolve) => setTimeout(resolve, delay));
              return attemptCheck();
            }

            // Max retries exceeded - default to false for security
            console.error('Expert status check failed after retries');
            return false;
          }

          // Explicitly validate the response
          return Boolean(data);
        } catch (error) {
          console.error('Unexpected error in expert check:', error);

          // Retry on unexpected errors
          if (retryCount < maxRetries) {
            retryCount++;
            const delay = baseDelay * 2 ** (retryCount - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return attemptCheck();
          }

          // Default to false for security
          return false;
        }
      };

      try {
        const expertResult = await attemptCheck();

        if (isMounted) {
          setIsExpert(expertResult);
        }
      } catch (error) {
        console.error('Expert status check encountered an unexpected error');
        if (isMounted) {
          setIsExpert(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkExpertStatus();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return { isExpert, loading };
};
