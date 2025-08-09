import { useCallback } from 'react';
import { AppError } from '@/types';

export class AppErrorHandler {
  static createError(message: string, code?: string, details?: unknown): AppError {
    return {
      message,
      code,
      details
    };
  }

  static handleSupabaseError(error: unknown): AppError {
    if (!error) return this.createError('Unknown error occurred');
    
    // Type guard for error objects
    const errorObj = error as Record<string, unknown>;
    
    // Handle common Supabase error patterns
    if (errorObj.code === 'PGRST116') {
      return this.createError('No data found', 'NOT_FOUND');
    }
    
    if (errorObj.code === '23505') {
      return this.createError('This record already exists', 'DUPLICATE');
    }
    
    if (errorObj.code === 'auth/weak-password') {
      return this.createError('Password is too weak', 'WEAK_PASSWORD');
    }
    
    const message = typeof errorObj.message === 'string' ? errorObj.message : '';
    if (message.includes('already registered')) {
      return this.createError('An account with this email already exists', 'DUPLICATE_EMAIL');
    }
    
    if (message.includes('rate limit')) {
      return this.createError('Too many requests. Please try again later.', 'RATE_LIMIT');
    }
    
    return this.createError(
      message || 'An unexpected error occurred',
      typeof errorObj.code === 'string' ? errorObj.code : undefined,
      error
    );
  }

  static getFriendlyErrorMessage(error: AppError): string {
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
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }
}

// Hook for standardized error handling  
export const useErrorHandler = () => {
  const handleError = useCallback((error: unknown, fallbackMessage = 'An error occurred'): AppError => {
    if (error instanceof Error) {
      return AppErrorHandler.createError(error.message, 'GENERIC_ERROR', error);
    }
    
    if (typeof error === 'object' && error !== null) {
      return AppErrorHandler.handleSupabaseError(error);
    }
    
    return AppErrorHandler.createError(fallbackMessage, 'UNKNOWN_ERROR', error);
  }, []);

  return { handleError, AppErrorHandler };
};