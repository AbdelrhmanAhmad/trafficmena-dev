import { AlertTriangle, RefreshCw } from 'lucide-react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
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
  loadingText,
  onRetry,
  emptyState,
  isEmpty = false,
}) => {
  const { t: tCommon } = useTranslation('common');
  const { t: tErrors } = useTranslation('errors');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text={loadingText ?? tCommon('actions.loading')} />
      </div>
    );
  }

  if (error) {
    const errorMessage = typeof error === 'string' ? error : error.message;

    return (
      <div className="flex items-center justify-center py-12">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">{tErrors('loadFailed')}</h3>
          <p className="mb-4 text-gray-600">
            {errorMessage || tErrors('serverError')}
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="me-2 h-4 w-4" />
              {tCommon('actions.tryAgain')}
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
