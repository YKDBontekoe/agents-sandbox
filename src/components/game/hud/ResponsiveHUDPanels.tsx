import React, { forwardRef, ReactNode } from 'react';
import { useHUDLayout } from './HUDLayoutSystem';

// Base responsive panel props
export interface ResponsivePanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
  collapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  title?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  priority?: 'low' | 'medium' | 'high';
}

// Responsive panel base component
export const ResponsivePanel = forwardRef<HTMLDivElement, ResponsivePanelProps>((
  { 
    children, 
    className = '', 
    variant = 'default',
    collapsible = false,
    isCollapsed = false,
    onToggleCollapse,
    title,
    icon,
    actions,
    priority = 'medium'
  }, 
  ref
) => {
  const { screenSize } = useHUDLayout();
  
  // Responsive styling based on screen size and variant
  const getResponsiveClasses = () => {
    const baseClasses = 'bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm pointer-events-auto';
    
    const sizeClasses = {
      mobile: {
        default: 'p-2 text-xs',
        compact: 'p-1.5 text-xs',
        minimal: 'p-1 text-xs'
      },
      tablet: {
        default: 'p-3 text-sm',
        compact: 'p-2 text-xs',
        minimal: 'p-1.5 text-xs'
      },
      desktop: {
        default: 'p-3 text-sm',
        compact: 'p-2 text-sm',
        minimal: 'p-2 text-xs'
      },
      wide: {
        default: 'p-4 text-sm',
        compact: 'p-3 text-sm',
        minimal: 'p-2 text-sm'
      }
    };

    const priorityClasses = {
      low: 'opacity-90',
      medium: 'opacity-95',
      high: 'opacity-100 ring-1 ring-blue-200'
    };

    const collapseClasses = isCollapsed ? 'scale-95 opacity-75' : '';
    
    return `${baseClasses} ${sizeClasses[screenSize][variant]} ${priorityClasses[priority]} ${collapseClasses} transition-all duration-200`;
  };

  const responsiveClasses = getResponsiveClasses();

  return (
    <div 
      ref={ref}
      className={`${responsiveClasses} ${className}`}
      data-variant={variant}
      data-screen-size={screenSize}
      data-priority={priority}
    >
      {(title || collapsible || actions) && (
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {icon && <span className="text-slate-500">{icon}</span>}
            {title && (
              <h3 className="font-medium text-slate-700 truncate">
                {title}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-1">
            {actions}
            {collapsible && (
              <button
                onClick={onToggleCollapse}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
              >
                <svg 
                  className={`w-3 h-3 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className={`${isCollapsed ? 'hidden' : 'block'}`}>
        {children}
      </div>
    </div>
  );
});

ResponsivePanel.displayName = 'ResponsivePanel';

// Responsive grid container for panels
interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    wide?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

export function ResponsiveGrid({ 
  children, 
  className = '', 
  columns = { mobile: 1, tablet: 2, desktop: 2, wide: 3 },
  gap = 'md'
}: ResponsiveGridProps) {
  const { screenSize } = useHUDLayout();
  
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  };
  
  const columnClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4'
  };
  
  const currentColumns = columns[screenSize] || 1;
  
  return (
    <div className={`grid ${columnClasses[currentColumns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

// Responsive stack container
interface ResponsiveStackProps {
  children: ReactNode;
  className?: string;
  direction?: {
    mobile?: 'vertical' | 'horizontal';
    tablet?: 'vertical' | 'horizontal';
    desktop?: 'vertical' | 'horizontal';
    wide?: 'vertical' | 'horizontal';
  };
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
}

export function ResponsiveStack({ 
  children, 
  className = '', 
  direction = { mobile: 'vertical', tablet: 'vertical', desktop: 'vertical', wide: 'vertical' },
  gap = 'md',
  align = 'stretch'
}: ResponsiveStackProps) {
  const { screenSize } = useHUDLayout();
  
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  };
  
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  };
  
  const currentDirection = direction[screenSize] || 'vertical';
  const flexDirection = currentDirection === 'horizontal' ? 'flex-row' : 'flex-col';
  
  return (
    <div className={`flex ${flexDirection} ${gapClasses[gap]} ${alignClasses[align]} ${className}`}>
      {children}
    </div>
  );
}

// Responsive text component
interface ResponsiveTextProps {
  children: ReactNode;
  className?: string;
  size?: {
    mobile?: 'xs' | 'sm' | 'base' | 'lg';
    tablet?: 'xs' | 'sm' | 'base' | 'lg';
    desktop?: 'xs' | 'sm' | 'base' | 'lg';
    wide?: 'xs' | 'sm' | 'base' | 'lg';
  };
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'muted' | 'danger' | 'success' | 'warning';
}

export function ResponsiveText({ 
  children, 
  className = '', 
  size = { mobile: 'xs', tablet: 'sm', desktop: 'sm', wide: 'base' },
  weight = 'normal',
  color = 'primary'
}: ResponsiveTextProps) {
  const { screenSize } = useHUDLayout();
  
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg'
  };
  
  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  };
  
  const colorClasses = {
    primary: 'text-slate-900',
    secondary: 'text-slate-700',
    muted: 'text-slate-500',
    danger: 'text-red-600',
    success: 'text-green-600',
    warning: 'text-yellow-600'
  };
  
  const currentSize = size[screenSize] || 'sm';
  
  return (
    <span className={`${sizeClasses[currentSize]} ${weightClasses[weight]} ${colorClasses[color]} ${className}`}>
      {children}
    </span>
  );
}

// Responsive button component
interface ResponsiveButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: {
    mobile?: 'xs' | 'sm' | 'md';
    tablet?: 'xs' | 'sm' | 'md';
    desktop?: 'xs' | 'sm' | 'md';
    wide?: 'xs' | 'sm' | 'md';
  };
  disabled?: boolean;
  fullWidth?: boolean;
}

export function ResponsiveButton({ 
  children, 
  onClick, 
  className = '', 
  variant = 'primary',
  size = { mobile: 'xs', tablet: 'sm', desktop: 'sm', wide: 'md' },
  disabled = false,
  fullWidth = false
}: ResponsiveButtonProps) {
  const { screenSize } = useHUDLayout();
  
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm'
  };
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white'
  };
  
  const currentSize = size[screenSize] || 'sm';
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
      `}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// Responsive icon component
interface ResponsiveIconProps {
  children: ReactNode;
  className?: string;
  size?: {
    mobile?: 'xs' | 'sm' | 'md' | 'lg';
    tablet?: 'xs' | 'sm' | 'md' | 'lg';
    desktop?: 'xs' | 'sm' | 'md' | 'lg';
    wide?: 'xs' | 'sm' | 'md' | 'lg';
  };
}

export function ResponsiveIcon({ 
  children, 
  className = '', 
  size = { mobile: 'sm', tablet: 'sm', desktop: 'md', wide: 'md' }
}: ResponsiveIconProps) {
  const { screenSize } = useHUDLayout();
  
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  const currentSize = size[screenSize] || 'sm';
  
  return (
    <span className={`inline-flex ${sizeClasses[currentSize]} ${className}`}>
      {children}
    </span>
  );
}