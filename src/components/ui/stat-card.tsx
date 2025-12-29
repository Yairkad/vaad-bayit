'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export type StatCardVariant = 'blue' | 'purple' | 'teal' | 'red' | 'orange' | 'green' | 'amber';

const variantStyles: Record<StatCardVariant, { bg: string; text: string; darkBg: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', darkBg: 'dark:bg-blue-950' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', darkBg: 'dark:bg-purple-950' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', darkBg: 'dark:bg-teal-950' },
  red: { bg: 'bg-red-100', text: 'text-red-600', darkBg: 'dark:bg-red-950' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', darkBg: 'dark:bg-orange-950' },
  green: { bg: 'bg-green-100', text: 'text-green-600', darkBg: 'dark:bg-green-950' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600', darkBg: 'dark:bg-amber-950' },
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: StatCardVariant;
  onClick?: () => void;
  className?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({
  title,
  value,
  icon: Icon,
  variant = 'blue',
  onClick,
  className,
  trend,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        'group transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-2">
          <div
            className={cn(
              'p-2 sm:p-2.5 rounded-xl shrink-0 transition-transform duration-200',
              styles.bg,
              styles.darkBg,
              onClick && 'group-hover:scale-110'
            )}
          >
            <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', styles.text)} />
          </div>
          <div className="min-w-0 flex-1 sm:w-full">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl sm:text-2xl font-bold tracking-tight">
                {value}
              </p>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
