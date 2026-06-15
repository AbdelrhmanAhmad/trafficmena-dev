/**
 * MetricCard Component
 *
 * Displays individual KPI metrics with optional trend indicators
 * Used throughout the admin dashboard for showing business metrics
 */

import type { LucideIcon } from 'lucide-react';
import type React from 'react';
import { Alert } from '@/shared/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { TrendIndicator } from './TrendIndicator';

export interface DashboardMetric {
  label: string;
  value: number;
  error?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    period?: string;
  };
}

interface MetricCardProps {
  metric: DashboardMetric;
  icon?: LucideIcon;
  className?: string;
  isLoading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  icon: Icon,
  className = '',
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card className={`transition-shadow hover:shadow-md ${className}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (metric.error) {
    return (
      <Card className={`transition-shadow hover:shadow-md ${className}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">{metric.label}</CardTitle>
          {Icon && <Icon className="h-4 w-4 text-gray-400" />}
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="p-2">
            <p className="text-xs">{metric.error}</p>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const formatValue = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <Card className={`transition-shadow hover:shadow-md ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{metric.label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-primary">{formatValue(metric.value)}</div>
          {metric.trend && (
            <TrendIndicator
              value={metric.trend.value}
              isPositive={metric.trend.isPositive}
              period={metric.trend.period}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
