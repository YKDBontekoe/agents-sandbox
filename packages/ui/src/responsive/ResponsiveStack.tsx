import React, { type ReactNode } from 'react';
import type { ResponsiveScreenSize } from './types';

export interface ResponsiveStackProps {
  screenSize: ResponsiveScreenSize;
  children: ReactNode;
  className?: string;
  direction?: Partial<Record<ResponsiveScreenSize, 'vertical' | 'horizontal'>>;
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
}

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4'
} as const;

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch'
} as const;

export function ResponsiveStack({
  screenSize,
  children,
  className = '',
  direction = { mobile: 'vertical', tablet: 'vertical', desktop: 'vertical', wide: 'vertical' },
  gap = 'md',
  align = 'stretch'
}: ResponsiveStackProps) {
  const currentDirection = direction[screenSize] ?? 'vertical';
  const flexDirection = currentDirection === 'horizontal' ? 'flex-row' : 'flex-col';

  return (
    <div className={`flex ${flexDirection} ${gapClasses[gap]} ${alignClasses[align]} ${className}`.trim()}>
      {children}
    </div>
  );
}
