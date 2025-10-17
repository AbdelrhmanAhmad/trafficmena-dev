/**
 * TrendIndicator Component
 *
 * Shows trend direction and percentage change for metrics
 * Used within MetricCard to display growth/decline indicators
 */

import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from 'lucide-react';
import type React from 'react';
import { cn } from '@/shared/lib/utils';

interface TrendIndicatorProps {
  value: number;
  isPositive: boolean;
  period: string;
  className?: string;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  value,
  isPositive,
  period,
  className = '',
}) => {
  const formatValue = (val: number): string => {
    if (val === 0) return '0';
    return val % 1 === 0 ? val.toString() : val.toFixed(1);
  };

  const getTrendIcon = () => {
    if (value === 0) return MinusIcon;
    return isPositive ? ArrowUpIcon : ArrowDownIcon;
  };

  const getTrendColor = () => {
    if (value === 0) return 'text-gray-400';
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const getTrendBgColor = () => {
    if (value === 0) return 'bg-gray-50';
    return isPositive ? 'bg-green-50' : 'bg-red-50';
  };

  const Icon = getTrendIcon();

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div
        className={cn(
          'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
          getTrendColor(),
          getTrendBgColor(),
        )}
      >
        <Icon className="h-3 w-3" />
        <span>{value === 0 ? '0' : `${formatValue(value)}${value !== 0 ? '%' : ''}`}</span>
      </div>
      <span className="text-xs text-gray-500">{period}</span>
    </div>
  );
};
