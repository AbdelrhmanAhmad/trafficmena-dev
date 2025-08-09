
import React from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  loadingText = "Loading...",
  onRetry,
  emptyState,
  isEmpty = false
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
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to load data
          </h3>
          <p className="text-gray-600 mb-4">
            {errorMessage || "An unexpected error occurred while loading the data."}
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
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
