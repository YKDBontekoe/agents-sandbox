import React, { useState } from 'react';
import { ResponsivePanel, ResponsiveButton, ResponsiveStack, ResponsiveIcon } from '../ResponsiveHUDPanels';
import { useHUDPanel } from '../HUDPanelRegistry';

interface ModularActionPanelProps {
  onOpenCouncil?: () => void;
  onOpenEdicts?: () => void;
  onOpenOmens?: () => void;
  onOpenSettings?: () => void;
  intervalMs?: number;
  onChangeIntervalMs?: (ms: number) => void;
  variant?: 'default' | 'compact' | 'minimal';
  collapsible?: boolean;
}

interface ActionItemProps {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'compact' | 'minimal';
  disabled?: boolean;
  badge?: string | number;
}

function ActionItem({ label, onClick, icon, variant = 'default', disabled = false, badge }: ActionItemProps) {
  const getButtonVariant = () => {
    if (disabled) return 'secondary';
    return 'primary';
  };

  const getButtonContent = () => {
    if (variant === 'minimal') {
      return (
        <div className="flex items-center justify-center gap-1">
          {icon && (
            <ResponsiveIcon size={{ mobile: 'sm', tablet: 'sm', desktop: 'md', wide: 'md' }}>
              {icon}
            </ResponsiveIcon>
          )}
          {badge && (
            <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
              {badge}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          {icon && (
            <ResponsiveIcon size={{ mobile: 'xs', tablet: 'sm', desktop: 'sm', wide: 'md' }}>
              {icon}
            </ResponsiveIcon>
          )}
          <span>{variant === 'compact' ? label.slice(0, 4) : label}</span>
        </div>
        {badge && (
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] text-center">
            {badge}
          </span>
        )}
      </div>
    );
  };

  return (
    <ResponsiveButton
      onClick={onClick}
      variant={getButtonVariant()}
      size={{ mobile: 'xs', tablet: 'sm', desktop: 'sm', wide: 'md' }}
      disabled={disabled}
      fullWidth={variant !== 'minimal'}
      className={`${variant === 'minimal' ? 'aspect-square' : 'justify-start text-left'} relative`}
    >
      {getButtonContent()}
    </ResponsiveButton>
  );
}

// Action icons
const actionIcons = {
  council: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  edicts: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  omens: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  settings: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
};

export function ModularActionPanel({ 
  onOpenCouncil, 
  onOpenEdicts, 
  onOpenOmens, 
  onOpenSettings, 
  intervalMs,
  onChangeIntervalMs,
  variant = 'default',
  collapsible = true 
}: ModularActionPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Register this panel with the HUD system
  useHUDPanel({
    config: {
      id: 'action-panel',
      zone: 'sidebar-right',
      priority: 8,
      responsive: {
        hideOnMobile: true
      },
      accessibility: {
        ariaLabel: 'Game action buttons',
        role: 'toolbar'
      }
    },
    component: ModularActionPanel,
    props: { variant, collapsible }
  });

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const titleIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  // Mock data for demonstration - in real app this would come from game state
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'council':
        return 3; // Number of pending proposals
      case 'edicts':
        return undefined; // No pending edicts
      case 'omens':
        return 1; // New omen available
      case 'settings':
        return undefined; // No notifications
      default:
        return undefined;
    }
  };

  const actions = [
    { label: 'Council', onClick: onOpenCouncil, icon: actionIcons.council, key: 'council' },
    { label: 'Edicts', onClick: onOpenEdicts, icon: actionIcons.edicts, key: 'edicts' },
    { label: 'Omens', onClick: onOpenOmens, icon: actionIcons.omens, key: 'omens' },
    { label: 'Settings', onClick: onOpenSettings, icon: actionIcons.settings, key: 'settings' }
  ];

  return (
    <ResponsivePanel
      title={variant === 'minimal' ? 'Act' : 'Actions'}
      icon={titleIcon}
      variant={variant}
      collapsible={collapsible}
      isCollapsed={isCollapsed}
      onToggleCollapse={handleToggleCollapse}
      priority="medium"
      className="min-w-0"
    >
      {/* Compact speed indicator (cycles presets on click) */}
      {variant !== 'minimal' && (
        <div className="flex items-center justify-end mb-2">
          <button
            type="button"
            onClick={() => {
              const presets = [120000, 60000, 30000, 15000];
              const cur = typeof intervalMs === 'number' ? intervalMs : 60000;
              let idx = presets.findIndex(p => Math.abs(p - cur) < 1);
              if (idx === -1) idx = 1; // default to 1x
              const next = presets[(idx + 1) % presets.length];
              onChangeIntervalMs?.(next);
            }}
            className="px-2 py-0.5 rounded-full border border-slate-300 bg-white text-[10px] text-slate-700 hover:bg-slate-50"
            aria-label="Cycle simulation speed"
            title="Click to cycle speed"
          >
            {(() => {
              const ms = typeof intervalMs === 'number' ? intervalMs : 60000;
              const x = Math.round((60000 / Math.max(1, ms)) * 100) / 100;
              return `Speed ${x}x`;
            })()}
          </button>
        </div>
      )}
      <ResponsiveStack 
        direction={{
          mobile: variant === 'minimal' ? 'horizontal' : 'vertical',
          tablet: variant === 'minimal' ? 'horizontal' : 'vertical',
          desktop: 'vertical',
          wide: 'vertical'
        }}
        gap={variant === 'minimal' ? 'sm' : 'md'}
        align="stretch"
      >
        {actions.map((action) => (
          <ActionItem
            key={action.key}
            label={action.label}
            onClick={action.onClick}
            icon={action.icon}
            variant={variant}
            badge={getActionBadge(action.key)}
          />
        ))}
      </ResponsiveStack>
    </ResponsivePanel>
  );
}

export default ModularActionPanel;
