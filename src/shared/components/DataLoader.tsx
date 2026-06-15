import { AlertTriangle, RefreshCw } from 'lucide-react';
import type React from 'react';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { Button } from '@/shared/components/ui/button';

interface DataLoaderProps {
  loading: boolean;
  error?: Error | string | null;
  children: React.ReactNode;
  loadingText?: string;
  onRetry?: () => void;
  emptyState?: React.ReactNode;
  isEmpty?: boolean;
}

const DataLoader: React.FC<DataLoaderProps> = ({
  loading,
  error,
  children,
  loadingText = 'Loading...',
  onRetry,
  emptyState,
  isEmpty = false,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text={loadingText} />
      </div>
    );
  }

  if (error) {
    const errorMessage = typeof error === 'string' ? error : error.message;

    return (
      <div className="flex items-center justify-center py-12">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">Failed to load data</h3>
          <p className="mb-4 text-gray-600">
            {errorMessage || 'An unexpected error occurred while loading the data.'}
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (isEmpty && emptyState) {
    return <>{emptyState}</>;
  }

  return <>{children}</>;
};

export default DataLoader;
