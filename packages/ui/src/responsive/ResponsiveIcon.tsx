import React, { type ReactNode } from 'react';
import type { ResponsiveScreenSize } from './types';

type ResponsiveIconSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ResponsiveIconProps {
  screenSize: ResponsiveScreenSize;
  children: ReactNode;
  className?: string;
  size?: Partial<Record<ResponsiveScreenSize, ResponsiveIconSize>>;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
} as const;

export function ResponsiveIcon({
  screenSize,
  children,
  className = '',
  size = { mobile: 'sm', tablet: 'sm', desktop: 'md', wide: 'md' }
}: ResponsiveIconProps) {
  const currentSize = size[screenSize] ?? 'sm';

  return (
    <span className={`inline-flex ${sizeClasses[currentSize]} ${className}`.trim()}>
      {children}
    </span>
  );
}
