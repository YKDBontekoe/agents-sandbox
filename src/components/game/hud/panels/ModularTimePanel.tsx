import React, { useState } from 'react';
import { ResponsivePanel, ResponsiveText, ResponsiveGrid, ResponsiveButton, ResponsiveIcon } from '../ResponsiveHUDPanels';
import { useHUDPanel } from '../HUDPanelRegistry';
import type { GameTime } from '../types';

interface ModularTimePanelProps {
  time: GameTime;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onAdvanceCycle?: () => void;
  variant?: 'default' | 'compact' | 'minimal';
  collapsible?: boolean;
}

interface TimeDisplayProps {
  label: string;
  value: string | number;
  variant?: 'default' | 'compact' | 'minimal';
  icon?: React.ReactNode;
}

function TimeDisplay({ label, value, variant = 'default', icon }: TimeDisplayProps) {
  return (
    <div className="text-center">
      {icon && variant !== 'minimal' && (
        <ResponsiveIcon 
          size={{ mobile: 'xs', tablet: 'sm', desktop: 'sm', wide: 'md' }}
          className="text-slate-500 mx-auto mb-1"
        >
          {icon}
        </ResponsiveIcon>
      )}
      
      <ResponsiveText 
        size={{ mobile: 'xs', tablet: 'xs', desktop: 'xs', wide: 'sm' }}
        color="muted"
        className="block mb-1"
      >
        {variant === 'minimal' ? label.slice(0, 3) : label}
      </ResponsiveText>
      
      <ResponsiveText 
        size={{ mobile: 'xs', tablet: 'sm', desktop: 'sm', wide: 'sm' }}
        weight="semibold"
        className="tabular-nums"
      >
        {value}
      </ResponsiveText>
    </div>
  );
}

interface TimeControlsProps {
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onAdvanceCycle?: () => void;
  variant?: 'default' | 'compact' | 'minimal';
}

function TimeControls({ isPaused, onPause, onResume, onAdvanceCycle, variant = 'default' }: TimeControlsProps) {
  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-1 justify-center">
        <ResponsiveButton
          onClick={isPaused ? onResume : onPause}
          variant={isPaused ? 'success' : 'secondary'}
          size={{ mobile: 'xs', tablet: 'xs', desktop: 'sm', wide: 'sm' }}
        >
          {isPaused ? '▶' : '⏸'}
        </ResponsiveButton>
        <ResponsiveButton
          onClick={onAdvanceCycle}
          variant="primary"
          size={{ mobile: 'xs', tablet: 'xs', desktop: 'sm', wide: 'sm' }}
        >
          ⏭
        </ResponsiveButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 justify-center">
      <ResponsiveButton
        onClick={isPaused ? onResume : onPause}
        variant={isPaused ? 'success' : 'secondary'}
        size={{ mobile: 'xs', tablet: 'sm', desktop: 'sm', wide: 'md' }}
      >
        {isPaused ? 'Resume' : 'Pause'}
      </ResponsiveButton>
      <ResponsiveButton
        onClick={onAdvanceCycle}
        variant="primary"
        size={{ mobile: 'xs', tablet: 'sm', desktop: 'sm', wide: 'md' }}
      >
        {variant === 'compact' ? 'Next' : 'Advance'}
      </ResponsiveButton>
    </div>
  );
}

// Time-related icons
const timeIcons = {
  cycle: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  season: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  timer: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

export function ModularTimePanel({ 
  time, 
  isPaused, 
  onPause, 
  onResume, 
  onAdvanceCycle, 
  variant = 'default',
  collapsible = true 
}: ModularTimePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Register this panel with the HUD system
  useHUDPanel({
    config: {
      id: 'time-panel',
      zone: 'top-right',
      priority: 9,
      persistent: true,
      responsive: {
        collapseOnMobile: true
      },
      accessibility: {
        ariaLabel: 'Time and cycle controls',
        role: 'region'
      }
    },
    component: ModularTimePanel,
    props: { variant, collapsible }
  });

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const titleIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const formatTimeRemaining = (timeRemaining: number) => {
    const seconds = Math.max(0, Math.round(timeRemaining));
    if (variant === 'minimal') {
      return `${seconds}s`;
    }
    return seconds > 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
  };

  return (
    <ResponsivePanel
      title={variant === 'minimal' ? 'Time' : 'Time Controls'}
      icon={titleIcon}
      variant={variant}
      collapsible={collapsible}
      isCollapsed={isCollapsed}
      onToggleCollapse={handleToggleCollapse}
      priority="high"
      className="min-w-0"
    >
      <ResponsiveGrid 
        columns={{ 
          mobile: variant === 'minimal' ? 3 : 2, 
          tablet: 3, 
          desktop: 3, 
          wide: 3 
        }}
        gap={variant === 'minimal' ? 'sm' : 'md'}
        className="mb-3"
      >
        <TimeDisplay 
          label="Cycle" 
          value={time.cycle} 
          variant={variant}
          icon={timeIcons.cycle}
        />
        <TimeDisplay 
          label="Season" 
          value={time.season} 
          variant={variant}
          icon={timeIcons.season}
        />
        <TimeDisplay 
          label={variant === 'minimal' ? 'Next' : 'Next in'} 
          value={formatTimeRemaining(time.timeRemaining)} 
          variant={variant}
          icon={timeIcons.timer}
        />
      </ResponsiveGrid>
      
      <div className="pt-2 border-t border-slate-200">
        <TimeControls 
          isPaused={isPaused}
          onPause={onPause}
          onResume={onResume}
          onAdvanceCycle={onAdvanceCycle}
          variant={variant}
        />
      </div>
    </ResponsivePanel>
  );
}

export default ModularTimePanel;