/**
 * Custom hook for secure query operations with proper cleanup and memory leak prevention
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

interface UseSecureQueryOptions {
  onUnmount?: () => void;
  debounceMs?: number;
}

export const useSecureQuery = (options: UseSecureQueryOptions = {}) => {
  const queryClient = useQueryClient();
  const isMountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const operationsRef = useRef<Set<{ promise: Promise<any>; controller: AbortController }>>(
    new Set(),
  );

  // Cleanup function to run on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Cancel any ongoing operations
      operationsRef.current.forEach(({ controller }) => {
        controller.abort();
      });
      operationsRef.current.clear();

      // Run custom cleanup
      if (options.onUnmount) {
        try {
          options.onUnmount();
        } catch (error) {
          console.warn('Error during cleanup:', error);
        }
      }
    };
  }, [options.onUnmount]);

  // Safe query invalidation that checks if component is still mounted
  const safeInvalidateQueries = useCallback(
    (queryKey: string | string[], delay = 0) => {
      const invalidate = () => {
        if (isMountedRef.current) {
          try {
            queryClient.invalidateQueries({
              queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
            });
          } catch (error) {
            console.warn('Query invalidation failed:', error);
          }
        }
      };

      if (delay > 0) {
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(invalidate, delay);
      } else {
        invalidate();
      }
    },
    [queryClient],
  );

  // Safe async operation wrapper that tracks operations and prevents memory leaks
  const safeAsyncOperation = useCallback(
    <T>(
      operation: () => Promise<T>,
      onSuccess?: (data: T) => void,
      onError?: (error: Error) => void,
      timeoutMs: number = 30000,
    ): Promise<T | null> => {
      return new Promise((resolve, reject) => {
        if (!isMountedRef.current) {
          resolve(null);
          return;
        }

        const controller = new AbortController();
        let operationEntry: {
          promise: Promise<any>;
          controller: AbortController;
        } | null = null;

        // Create timeout for the operation
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeoutMs);

        const operationPromise = operation()
          .then((data) => {
            // Clear timeout and remove from tracking set
            clearTimeout(timeoutId);
            if (operationEntry) {
              operationsRef.current.delete(operationEntry);
            }

            if (isMountedRef.current && !controller.signal.aborted) {
              if (onSuccess) {
                onSuccess(data);
              }
              resolve(data);
            } else {
              resolve(null);
            }
          })
          .catch((error) => {
            // Clear timeout and remove from tracking set
            clearTimeout(timeoutId);
            if (operationEntry) {
              operationsRef.current.delete(operationEntry);
            }

            // Don't handle errors if operation was aborted
            if (controller.signal.aborted) {
              resolve(null);
              return;
            }

            if (isMountedRef.current) {
              if (onError) {
                onError(error);
              }
              reject(error);
            } else {
              // Don't reject if component is unmounted
              resolve(null);
            }
          });

        // Create and track the operation entry
        operationEntry = { promise: operationPromise, controller };
        operationsRef.current.add(operationEntry);
      });
    },
    [],
  );

  // Debounced invalidation for frequent operations
  const debouncedInvalidateQueries = useCallback(
    (queryKey: string | string[]) => {
      const debounceMs = options.debounceMs || 300;
      safeInvalidateQueries(queryKey, debounceMs);
    },
    [safeInvalidateQueries, options.debounceMs],
  );

  // Check if component is still mounted
  const isMounted = useCallback(() => isMountedRef.current, []);

  // Safe state update wrapper
  const safeStateUpdate = useCallback((updateFn: () => void) => {
    if (isMountedRef.current) {
      try {
        updateFn();
      } catch (error) {
        console.warn('State update failed:', error);
      }
    }
  }, []);

  return {
    safeInvalidateQueries,
    debouncedInvalidateQueries,
    safeAsyncOperation,
    isMounted,
    safeStateUpdate,
  };
};
