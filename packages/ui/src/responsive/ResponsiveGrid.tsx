import React, { type ReactNode } from 'react';
import type { ResponsiveScreenSize } from './types';

export interface ResponsiveGridProps {
  screenSize: ResponsiveScreenSize;
  children: ReactNode;
  className?: string;
  columns?: Partial<Record<ResponsiveScreenSize, number>>;
  gap?: 'sm' | 'md' | 'lg';
}

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4'
} as const;

const columnClasses: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4'
};

export function ResponsiveGrid({
  screenSize,
  children,
  className = '',
  columns = { mobile: 1, tablet: 2, desktop: 2, wide: 3 },
  gap = 'md'
}: ResponsiveGridProps) {
  const currentColumns = columns[screenSize] ?? 1;
  const gridClasses = columnClasses[currentColumns] ?? columnClasses[1];

  return (
    <div className={`grid ${gridClasses} ${gapClasses[gap]} ${className}`.trim()}>
      {children}
    </div>
  );
}
