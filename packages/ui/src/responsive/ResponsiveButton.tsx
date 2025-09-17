import React, { type ReactNode } from 'react';
import type { ResponsiveScreenSize } from './types';

type ResponsiveButtonSize = 'xs' | 'sm' | 'md';
type ResponsiveButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';

export interface ResponsiveButtonProps {
  screenSize: ResponsiveScreenSize;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: ResponsiveButtonVariant;
  size?: Partial<Record<ResponsiveScreenSize, ResponsiveButtonSize>>;
  disabled?: boolean;
  fullWidth?: boolean;
}

const sizeClasses = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm'
} as const;

const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-100',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white'
} as const;

export function ResponsiveButton({
  screenSize,
  children,
  onClick,
  className = '',
  variant = 'primary',
  size = { mobile: 'xs', tablet: 'sm', desktop: 'sm', wide: 'md' },
  disabled = false,
  fullWidth = false
}: ResponsiveButtonProps) {
  const currentSize = size[screenSize] ?? 'sm';
  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`
        ${sizeClasses[currentSize]}
        ${variantClasses[variant]}
        ${widthClass}
        ${disabledClass}
        rounded font-medium transition-colors duration-200
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
