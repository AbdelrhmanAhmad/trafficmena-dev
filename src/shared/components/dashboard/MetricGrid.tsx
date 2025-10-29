/**
 * MetricGrid Component
 *
 * Responsive grid layout for displaying multiple MetricCard components
 * Handles loading states and error handling for the entire metrics set
 */

import { type LucideIcon, RefreshCw } from 'lucide-react';
import type React from 'react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { type DashboardMetric, MetricCard } from './MetricCard';

interface MetricDefinition {
  key: string;
  icon: LucideIcon;
  metric: DashboardMetric;
}

interface MetricGridProps {
  metrics: MetricDefinition[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
  columns?: 2 | 3 | 4 | 6;
}

export const MetricGrid: React.FC<MetricGridProps> = ({
  metrics,
  isLoading = false,
  error,
  onRetry,
  className = '',
  columns = 3,
}) => {
  const getGridClasses = () => {
    const gridMap = {
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    };
    return gridMap[columns];
  };

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load dashboard metrics: {error}</span>
            {onRetry && (
              <Button onClick={onRetry} variant="outline" size="sm" className="ml-4">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${getGridClasses()} ${className}`}>
      {metrics.map(({ key, icon, metric }) => (
        <MetricCard key={key} metric={metric} icon={icon} isLoading={isLoading} />
      ))}
    </div>
  );
};
