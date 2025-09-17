import React, { type ReactNode } from 'react';
import type { ResponsiveScreenSize } from './types';

type ResponsiveTextSize = 'xs' | 'sm' | 'base' | 'lg';
type ResponsiveTextWeight = 'normal' | 'medium' | 'semibold' | 'bold';
type ResponsiveTextColor = 'primary' | 'secondary' | 'muted' | 'danger' | 'success' | 'warning';

export interface ResponsiveTextProps {
  screenSize: ResponsiveScreenSize;
  children: ReactNode;
  className?: string;
  size?: Partial<Record<ResponsiveScreenSize, ResponsiveTextSize>>;
  weight?: ResponsiveTextWeight;
  color?: ResponsiveTextColor;
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg'
} as const;

const weightClasses = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold'
} as const;

const colorClasses = {
  primary: 'text-gray-200',
  secondary: 'text-gray-300',
  muted: 'text-gray-400',
  danger: 'text-red-400',
  success: 'text-green-400',
  warning: 'text-yellow-400'
} as const;

export function ResponsiveText({
  screenSize,
  children,
  className = '',
  size = { mobile: 'xs', tablet: 'sm', desktop: 'sm', wide: 'base' },
  weight = 'normal',
  color = 'primary'
}: ResponsiveTextProps) {
  const currentSize = size[screenSize] ?? 'sm';

  return (
    <span className={`${sizeClasses[currentSize]} ${weightClasses[weight]} ${colorClasses[color]} ${className}`.trim()}>
      {children}
    </span>
  );
}
