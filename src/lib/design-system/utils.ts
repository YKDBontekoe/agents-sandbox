/**
 * Design System Utilities
 * Helper functions for consistent styling and component variants
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { tokens, spacing, borderRadius, shadows } from './tokens';

// Enhanced className utility that merges Tailwind classes intelligently
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to convert spacing token keys to Tailwind classes
const getSpacingClass = (size: keyof typeof spacing): string => {
  // Convert spacing token keys to Tailwind spacing classes
  const spacingMap: Record<string, string> = {
    '0': '0',
    'px': 'px',
    '0.5': '0.5',
    '1': '1',
    '1.5': '1.5',
    '2': '2',
    '2.5': '2.5',
    '3': '3',
    '3.5': '3.5',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    '11': '11',
    '12': '12',
    '14': '14',
    '16': '16',
    '20': '20',
    '24': '24',
    '28': '28',
    '32': '32',
    '36': '36',
    '40': '40',
    '44': '44',
    '48': '48',
    '52': '52',
    '56': '56',
    '60': '60',
    '64': '64',
    '72': '72',
    '80': '80',
    '96': '96',
  };
  
  return spacingMap[String(size)] || '4';
};

// Spacing utilities - using standard Tailwind classes
export const spacingUtils = {
  // Get spacing value by key
  get: (key: keyof typeof spacing) => spacing[key],
  
  // Generate padding classes using standard Tailwind spacing scale
  padding: {
    all: (size: keyof typeof spacing) => `p-${getSpacingClass(size)}`,
    x: (size: keyof typeof spacing) => `px-${getSpacingClass(size)}`,
    y: (size: keyof typeof spacing) => `py-${getSpacingClass(size)}`,
    top: (size: keyof typeof spacing) => `pt-${getSpacingClass(size)}`,
    right: (size: keyof typeof spacing) => `pr-${getSpacingClass(size)}`,
    bottom: (size: keyof typeof spacing) => `pb-${getSpacingClass(size)}`,
    left: (size: keyof typeof spacing) => `pl-${getSpacingClass(size)}`,
  },
  
  // Generate margin classes using standard Tailwind spacing scale
  margin: {
    all: (size: keyof typeof spacing) => `m-${getSpacingClass(size)}`,
    x: (size: keyof typeof spacing) => `mx-${getSpacingClass(size)}`,
    y: (size: keyof typeof spacing) => `my-${getSpacingClass(size)}`,
    top: (size: keyof typeof spacing) => `mt-${getSpacingClass(size)}`,
    right: (size: keyof typeof spacing) => `mr-${getSpacingClass(size)}`,
    bottom: (size: keyof typeof spacing) => `mb-${getSpacingClass(size)}`,
    left: (size: keyof typeof spacing) => `ml-${getSpacingClass(size)}`,
  },
  
  // Generate gap classes using standard Tailwind spacing scale
  gap: (size: keyof typeof spacing) => `gap-${getSpacingClass(size)}`,
};

// Border radius utilities - using standard Tailwind classes
export const radiusUtils = {
  get: (key: keyof typeof borderRadius) => borderRadius[key],
  class: (key: keyof typeof borderRadius) => {
    const radiusMap: Record<string, string> = { 
      none: 'rounded-none', 
      sm: 'rounded-sm',
      base: 'rounded',
      md: 'rounded-md', 
      lg: 'rounded-lg', 
      xl: 'rounded-xl', 
      '2xl': 'rounded-2xl',
      '3xl': 'rounded-3xl',
      full: 'rounded-full' 
    };
    return radiusMap[String(key)] || 'rounded-md';
  },
};

// Shadow utilities
export const shadowUtils = {
  get: (key: keyof typeof shadows) => shadows[key],
  class: (key: keyof typeof shadows) => {
    if (key === 'none') return 'shadow-none';
    return `shadow-[${shadows[key]}]`;
  },
};

// Typography utilities
export const typographyUtils = {
  // Font size classes
  fontSize: {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
    '5xl': 'text-5xl',
    '6xl': 'text-6xl',
    '7xl': 'text-7xl',
    '8xl': 'text-8xl',
    '9xl': 'text-9xl',
  },
  
  // Font weight classes
  fontWeight: {
    thin: 'font-thin',
    extralight: 'font-extralight',
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
    black: 'font-black',
  },
  
  // Text color utilities
  textColor: {
    primary: 'text-[var(--color-text-primary)]',
    secondary: 'text-[var(--color-text-secondary)]',
    tertiary: 'text-[var(--color-text-tertiary)]',
    inverse: 'text-[var(--color-text-inverse)]',
    disabled: 'text-[var(--color-text-disabled)]',
    link: 'text-[var(--color-text-link)]',
    error: 'text-[var(--color-status-error)]',
    success: 'text-[var(--color-status-success)]',
    warning: 'text-[var(--color-status-warning)]',
    info: 'text-[var(--color-status-info)]',
  },
};

// Background utilities
export const backgroundUtils = {
  primary: 'bg-[var(--color-background-primary)]',
  secondary: 'bg-[var(--color-background-secondary)]',
  tertiary: 'bg-[var(--color-background-tertiary)]',
  inverse: 'bg-[var(--color-background-inverse)]',
  elevated: 'bg-[var(--color-background-elevated)]',
  
  // Interactive backgrounds
  interactive: {
    primary: 'bg-[var(--color-interactive-primary)]',
    'primary-hover': 'hover:bg-[var(--color-interactive-primary-hover)]',
    'primary-active': 'active:bg-[var(--color-interactive-primary-active)]',
    secondary: 'bg-[var(--color-interactive-secondary)]',
    'secondary-hover': 'hover:bg-[var(--color-interactive-secondary-hover)]',
    'secondary-active': 'active:bg-[var(--color-interactive-secondary-active)]',
  },
  
  // Status backgrounds
  status: {
    error: 'bg-[var(--color-status-error-bg)]',
    success: 'bg-[var(--color-status-success-bg)]',
    warning: 'bg-[var(--color-status-warning-bg)]',
    info: 'bg-[var(--color-status-info-bg)]',
  },
};

// Border utilities
export const borderUtils = {
  primary: 'border-[var(--color-border-primary)]',
  secondary: 'border-[var(--color-border-secondary)]',
  tertiary: 'border-[var(--color-border-tertiary)]',
  focus: 'border-[var(--color-border-focus)]',
  error: 'border-[var(--color-border-error)]',
  success: 'border-[var(--color-border-success)]',
  warning: 'border-[var(--color-border-warning)]',
  info: 'border-[var(--color-border-info)]',
};

// Component size variants
export const sizeVariants = {
  button: {
    xs: 'h-6 px-2 text-xs',
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
    xl: 'h-14 px-8 text-lg',
  },
  
  input: {
    xs: 'h-6 px-2 text-xs',
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-3 text-sm',
    lg: 'h-12 px-4 text-base',
    xl: 'h-14 px-4 text-lg',
  },
  
  icon: {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  },
  
  avatar: {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  },
};

// Animation utilities
export const animationUtils = {
  // Transition classes
  transition: {
    none: 'transition-none',
    all: 'transition-all duration-200 ease-in-out',
    colors: 'transition-colors duration-200 ease-in-out',
    opacity: 'transition-opacity duration-200 ease-in-out',
    transform: 'transition-transform duration-200 ease-in-out',
    fast: 'transition-all duration-150 ease-in-out',
    slow: 'transition-all duration-300 ease-in-out',
  },
  
  // Transform utilities
  transform: {
    scale: {
      hover: 'hover:scale-105',
      active: 'active:scale-95',
    },
    translate: {
      up: 'hover:-translate-y-1',
      down: 'hover:translate-y-1',
    },
  },
};

// Focus utilities
export const focusUtils = {
  ring: 'focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:ring-offset-2',
  ringInset: 'focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:ring-inset',
  outline: 'focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-border-focus)]',
};

// Layout utilities
export const layoutUtils = {
  // Flexbox utilities
  flex: {
    center: 'flex items-center justify-center',
    centerY: 'flex items-center',
    centerX: 'flex justify-center',
    between: 'flex items-center justify-between',
    start: 'flex items-center justify-start',
    end: 'flex items-center justify-end',
    col: 'flex flex-col',
    colCenter: 'flex flex-col items-center justify-center',
  },
  
  // Grid utilities
  grid: {
    cols1: 'grid grid-cols-1',
    cols2: 'grid grid-cols-2',
    cols3: 'grid grid-cols-3',
    cols4: 'grid grid-cols-4',
    cols6: 'grid grid-cols-6',
    cols12: 'grid grid-cols-12',
    responsive: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  },
  
  // Container utilities
  container: {
    sm: 'max-w-sm mx-auto',
    md: 'max-w-md mx-auto',
    lg: 'max-w-lg mx-auto',
    xl: 'max-w-xl mx-auto',
    '2xl': 'max-w-2xl mx-auto',
    '4xl': 'max-w-4xl mx-auto',
    '6xl': 'max-w-6xl mx-auto',
    full: 'max-w-full mx-auto',
  },
};

// Responsive utilities
export const responsiveUtils = {
  // Breakpoint helpers
  breakpoints: {
    sm: 'sm:',
    md: 'md:',
    lg: 'lg:',
    xl: 'xl:',
    '2xl': '2xl:',
  },
  
  // Common responsive patterns
  hide: {
    mobile: 'hidden sm:block',
    tablet: 'hidden md:block',
    desktop: 'hidden lg:block',
  },
  
  show: {
    mobile: 'block sm:hidden',
    tablet: 'block md:hidden',
    desktop: 'block lg:hidden',
  },
};

// Utility function to create consistent component variants
export function createVariants<T extends Record<string, Record<string, string>>>(
  variants: T
): T {
  return variants;
}

// Utility function to merge variant classes
export function mergeVariants(
  baseClasses: string,
  variants: Record<string, string | undefined>,
  className?: string
): string {
  const variantClasses = Object.values(variants).filter(Boolean).join(' ');
  return cn(baseClasses, variantClasses, className);
}

// Utility to generate CSS custom property
export function cssVar(property: string): string {
  return `var(--${property})`;
}

// Utility to create theme-aware CSS custom properties
export function themeVar(path: string): string {
  return `var(--color-${path})`;
}

// Export all utilities as a single object
export const designUtils = {
  spacing: spacingUtils,
  radius: radiusUtils,
  shadow: shadowUtils,
  typography: typographyUtils,
  background: backgroundUtils,
  border: borderUtils,
  size: sizeVariants,
  animation: animationUtils,
  focus: focusUtils,
  layout: layoutUtils,
  responsive: responsiveUtils,
  cn,
  createVariants,
  mergeVariants,
  cssVar,
  themeVar,
};

export default designUtils;