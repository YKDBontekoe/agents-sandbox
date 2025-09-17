import React, { forwardRef, type ReactNode } from 'react';
import type { ResponsiveScreenSize } from './types';

export interface ResponsivePanelProps {
  screenSize: ResponsiveScreenSize;
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

export const ResponsivePanel = forwardRef<HTMLDivElement, ResponsivePanelProps>((
  {
    screenSize,
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
  const baseClasses = 'bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-sm pointer-events-auto';

  const sizeClasses: Record<ResponsiveScreenSize, Record<'default' | 'compact' | 'minimal', string>> = {
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
    high: 'opacity-100 ring-1 ring-blue-400/30'
  } as const;

  const collapseClasses = isCollapsed ? 'scale-95 opacity-75' : '';

  const responsiveClasses = [
    baseClasses,
    sizeClasses[screenSize][variant],
    priorityClasses[priority],
    collapseClasses,
    'transition-all duration-200'
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      className={`${responsiveClasses} ${className}`.trim()}
      data-variant={variant}
      data-screen-size={screenSize}
      data-priority={priority}
    >
      {(title || collapsible || actions) && (
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-700">
          <div className="flex items-center gap-2">
            {icon && <span className="text-gray-400">{icon}</span>}
            {title && (
              <h3 className="font-medium text-gray-200 truncate">
                {title}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-1">
            {actions}
            {collapsible && (
              <button
                onClick={onToggleCollapse}
                className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
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

      <div className={isCollapsed ? 'hidden' : 'block'}>
        {children}
      </div>
    </div>
  );
});

ResponsivePanel.displayName = 'ResponsivePanel';
