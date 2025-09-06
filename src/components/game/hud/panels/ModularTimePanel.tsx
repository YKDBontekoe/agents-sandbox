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
  intervalMs?: number;
  onChangeIntervalMs?: (ms: number) => void;
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
          className="text-gray-400 mx-auto mb-1"
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
  intervalMs,
  onChangeIntervalMs,
  variant = 'default',
  collapsible = true 
}: ModularTimePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Register this panel with the HUD system
  useHUDPanel({
    config: {
      id: 'time-panel',
      zone: 'sidebar-right',
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
      
      <div className="pt-2 border-t border-gray-700">
        <TimeControls 
          isPaused={isPaused}
          onPause={onPause}
          onResume={onResume}
          onAdvanceCycle={onAdvanceCycle}
          variant={variant}
        />
      </div>

      {variant !== 'minimal' && (
        <div className="mt-3 border-t border-gray-700 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Simulation Speed</span>
            <span className="text-xs tabular-nums text-gray-200">
              {(() => {
                const ms = typeof intervalMs === 'number' ? intervalMs : (typeof time.intervalMs === 'number' ? time.intervalMs! : 60000);
                const x = Math.round((60000 / Math.max(1, ms)) * 100) / 100;
                return `${x}x`;
              })()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.25}
              value={(() => {
                const ms = typeof intervalMs === 'number' ? intervalMs : (typeof time.intervalMs === 'number' ? time.intervalMs! : 60000);
                return Math.round((60000 / Math.max(1, ms)) * 100) / 100;
              })()}
              onChange={(e) => {
                const x = Number(e.target.value);
                const ms = Math.round(60000 / Math.min(4, Math.max(0.25, x)));
                onChangeIntervalMs?.(ms);
              }}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              aria-label="Simulation speed"
            />
            <span className="text-[10px] text-gray-400">1x=60s</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[
              { label: '0.5x', ms: 120000 },
              { label: '1x', ms: 60000 },
              { label: '2x', ms: 30000 },
              { label: '4x', ms: 15000 },
            ].map(opt => {
              const ms = typeof intervalMs === 'number' ? intervalMs : (typeof time.intervalMs === 'number' ? time.intervalMs! : 60000);
              const active = Math.abs(ms - opt.ms) < 1;
              return (
                <button
                  key={opt.label}
                  onClick={() => onChangeIntervalMs?.(opt.ms)}
                  className={`px-2 py-1 rounded border text-xs transition-colors ${active ? 'border-blue-500 bg-blue-900/40 text-blue-300' : 'border-gray-600 hover:bg-gray-700 text-gray-200'}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </ResponsivePanel>
  );
}

export default ModularTimePanel;
