import { useCallback } from 'react';
import type { AppError } from '@/types';

// Type for Promise.allSettled result handling
export interface PromiseResult<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export const createAppError = (message: string, code?: string, details?: unknown): AppError => ({
  message,
  code,
  details,
});

/**
 * Safely extract data from Promise.allSettled results with proper error handling
 */
export const extractPromiseResult = <T>(
  result: PromiseSettledResult<any>,
  operationName: string,
): PromiseResult<T> => {
  if (result.status === 'fulfilled') {
    if (result.value.error) {
      console.error(`${operationName} failed:`, result.value.error);
      return {
        data: null,
        error: getFriendlyErrorMessage(handleSupabaseError(result.value.error)),
        success: false,
      };
    }
    return {
      data: result.value.data,
      error: null,
      success: true,
    };
  } else {
    console.error(`${operationName} rejected:`, result.reason);
    return {
      data: null,
      error: `Failed to ${operationName.toLowerCase()}. Please try again.`,
      success: false,
    };
  }
};

/**
 * Handle multiple Promise.allSettled results and collect errors
 */
export const handlePromiseResults = <T extends Record<string, any>>(
  results: PromiseSettledResult<any>[],
  operationNames: string[],
): {
  data: Partial<T>;
  errors: string[];
  hasErrors: boolean;
  partialSuccess: boolean;
} => {
  const data: Partial<T> = {};
  const errors: string[] = [];
  let successCount = 0;

  results.forEach((result, index) => {
    const operationName = operationNames[index] || `operation-${index}`;
    const extracted = extractPromiseResult(result, operationName);

    if (extracted.success) {
      successCount += 1;
      const key = operationName.toLowerCase().replace(/\s+/g, '_') as keyof T;
      (data as Record<string, unknown>)[key] = extracted.data as unknown;
    } else if (extracted.error) {
      errors.push(extracted.error);
    }
  });

  return {
    data,
    errors,
    hasErrors: errors.length > 0,
    partialSuccess: successCount > 0 && errors.length > 0,
  };
};

export const handleSupabaseError = (error: unknown): AppError => {
  if (!error) return createAppError('Unknown error occurred');

  const errorObj = error as Record<string, unknown>;

  if (errorObj.code === 'PGRST116') {
    return createAppError('No data found', 'NOT_FOUND');
  }

  if (errorObj.code === '23505') {
    return createAppError('This record already exists', 'DUPLICATE');
  }

  if (errorObj.code === '42501') {
    return createAppError(
      'You do not have permission to perform this action. Please contact an administrator.',
      'PERMISSION_DENIED',
    );
  }

  if (errorObj.code === 'auth/weak-password') {
    return createAppError('Password is too weak', 'WEAK_PASSWORD');
  }

  const message = typeof errorObj.message === 'string' ? errorObj.message : '';
  if (message.includes('already registered')) {
    return createAppError('An account with this email already exists', 'DUPLICATE_EMAIL');
  }

  if (message.includes('rate limit')) {
    return createAppError('Too many requests. Please try again later.', 'RATE_LIMIT');
  }

  return createAppError(
    message || 'An unexpected error occurred',
    typeof errorObj.code === 'string' ? errorObj.code : undefined,
    error,
  );
};

export const getFriendlyErrorMessage = (error: AppError): string => {
  switch (error.code) {
    case 'NOT_FOUND':
      return 'The requested information could not be found.';
    case 'DUPLICATE':
      return 'This information already exists in our system.';
    case 'DUPLICATE_EMAIL':
      return 'An account with this email already exists. Please sign in instead.';
    case 'WEAK_PASSWORD':
      return 'Please choose a stronger password with at least 8 characters.';
    case 'RATE_LIMIT':
      return 'Too many requests. Please wait a moment before trying again.';
    case 'NETWORK_ERROR':
      return 'Network connection issue. Please check your internet connection.';
    case 'PERMISSION_DENIED':
      return 'Access denied. You need administrator privileges to perform this action.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};

export const AppErrorHandler = {
  createError: createAppError,
  extractPromiseResult,
  handlePromiseResults,
  handleSupabaseError,
  getFriendlyErrorMessage,
} as const;

// Hook for standardized error handling
export const useErrorHandler = () => {
  const handleError = useCallback(
    (error: unknown, fallbackMessage = 'An error occurred'): AppError => {
      if (error instanceof Error) {
        return AppErrorHandler.createError(error.message, 'GENERIC_ERROR', error);
      }

      if (typeof error === 'object' && error !== null) {
        return AppErrorHandler.handleSupabaseError(error);
      }

      return AppErrorHandler.createError(fallbackMessage, 'UNKNOWN_ERROR', error);
    },
    [],
  );

  return { handleError, AppErrorHandler };
};
