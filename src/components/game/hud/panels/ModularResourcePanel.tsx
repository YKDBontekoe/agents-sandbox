import React, { useState } from 'react';
import {
  ResponsivePanel,
  ResponsiveText,
  ResponsiveGrid,
  ResponsiveIcon,
  type ResponsiveScreenSize
} from '@arcane/ui/responsive';
import { useHUDPanel } from '../HUDPanelRegistry';
import { useHUDLayout } from '../HUDLayoutSystem';
import type { GameResources, WorkforceInfo } from '../types';

interface ModularResourcePanelProps {
  resources: GameResources;
  workforce: WorkforceInfo;
  changes: Partial<Record<keyof GameResources, number | null>>;
  shortages?: Partial<Record<keyof GameResources, number>>;
  variant?: 'default' | 'compact' | 'minimal';
  collapsible?: boolean;
}

interface ResourceItemProps {
  label: string;
  value: number;
  delta?: number | null;
  danger?: boolean;
  icon?: React.ReactNode;
  variant?: 'default' | 'compact' | 'minimal';
  screenSize: ResponsiveScreenSize;
}

function ResourceItem({ label, value, delta, danger, icon, variant = 'default', screenSize }: ResourceItemProps) {
  const showDelta = typeof delta === 'number' && delta !== 0;

  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {icon && (
          <ResponsiveIcon
            screenSize={screenSize}
            size={{ mobile: 'xs', tablet: 'sm', desktop: 'sm', wide: 'md' }}
            className="text-gray-400 flex-shrink-0"
          >
            {icon}
          </ResponsiveIcon>
        )}
        <ResponsiveText
          screenSize={screenSize}
          size={{ mobile: 'xs', tablet: 'xs', desktop: 'sm', wide: 'sm' }}
          weight="medium"
          color={danger ? 'danger' : 'primary'}
          className="truncate"
        >
          {variant === 'minimal' ? label.slice(0, 3) : label}
        </ResponsiveText>
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        <ResponsiveText
          screenSize={screenSize}
          size={{ mobile: 'xs', tablet: 'xs', desktop: 'sm', wide: 'sm' }}
          weight="semibold"
          color={danger ? 'danger' : 'primary'}
          className="tabular-nums"
        >
          {value.toLocaleString()}
        </ResponsiveText>

        {showDelta && (
          <ResponsiveText
            screenSize={screenSize}
            size={{ mobile: 'xs', tablet: 'xs', desktop: 'xs', wide: 'sm' }}
            color={delta! > 0 ? 'success' : 'danger'}
            className="tabular-nums"
          >
            {delta! > 0 ? '+' : ''}{delta!.toLocaleString()}
          </ResponsiveText>
        )}
      </div>
    </div>
  );
}

function WorkforceSection({
  workforce,
  variant,
  screenSize
}: {
  workforce: WorkforceInfo;
  variant: 'default' | 'compact' | 'minimal';
  screenSize: ResponsiveScreenSize;
}) {
  if (variant === 'minimal') return null;

  return (
    <div className="mt-3 pt-2 border-t border-gray-700">
      <ResponsiveGrid
        screenSize={screenSize}
        columns={{ mobile: 1, tablet: 2, desktop: 2, wide: 2 }}
        gap="sm"
      >
        <div className="text-center">
          <ResponsiveText
            screenSize={screenSize}
            size={{ mobile: 'xs', tablet: 'xs', desktop: 'xs', wide: 'sm' }}
            color="muted"
            className="block mb-1"
          >
            Workforce
          </ResponsiveText>
          <ResponsiveText
            screenSize={screenSize}
            size={{ mobile: 'xs', tablet: 'sm', desktop: 'sm', wide: 'sm' }}
            weight="medium"
            className="tabular-nums"
          >
            {workforce.idle}/{workforce.total}
          </ResponsiveText>
        </div>

        <div className="text-center">
          <ResponsiveText
            screenSize={screenSize}
            size={{ mobile: 'xs', tablet: 'xs', desktop: 'xs', wide: 'sm' }}
            color="muted"
            className="block mb-1"
          >
            Needed
          </ResponsiveText>
          <ResponsiveText
            screenSize={screenSize}
            size={{ mobile: 'xs', tablet: 'sm', desktop: 'sm', wide: 'sm' }}
            weight="medium"
            className="tabular-nums"
          >
            {workforce.needed}
          </ResponsiveText>
        </div>
      </ResponsiveGrid>
    </div>
  );
}

// Resource icons
const resourceIcons = {
  grain: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  coin: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  ),
  mana: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  favor: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  wood: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19l4-2 4 2 4-2 4 2V7l-4-2-4 2-4-2-4 2v12z" />
    </svg>
  ),
  planks: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
    </svg>
  ),
  unrest: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  threat: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
};

export function ModularResourcePanel({
  resources,
  workforce,
  changes,
  shortages,
  variant = 'default',
  collapsible = true
}: ModularResourcePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { screenSize } = useHUDLayout();
  
  // Register this panel with the HUD system
  useHUDPanel({
    config: {
      id: 'resources',
      zone: 'sidebar-right',
      priority: 10,
      persistent: true,
      responsive: {
        collapseOnMobile: true
      },
      accessibility: {
        ariaLabel: 'Resource information panel',
        role: 'region'
      }
    },
    component: ModularResourcePanel,
    props: { variant, collapsible }
  });

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const titleIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );

  return (
    <ResponsivePanel
      screenSize={screenSize}
      title={variant !== 'minimal' ? 'Resources' : 'Res'}
      icon={titleIcon}
      variant={variant}
      collapsible={collapsible}
      isCollapsed={isCollapsed}
      onToggleCollapse={handleToggleCollapse}
      priority="high"
      className="min-w-0"
    >
      <div className="space-y-1">
        <ResourceItem
          screenSize={screenSize}
          label="Grain"
          value={resources.grain}
          delta={changes.grain}
          danger={!!shortages?.grain}
          icon={resourceIcons.grain}
          variant={variant}
        />
        <ResourceItem
          screenSize={screenSize}
          label="Wood"
          value={resources.wood}
          delta={changes.wood}
          danger={!!shortages?.wood}
          icon={resourceIcons.wood}
          variant={variant}
        />
        <ResourceItem
          screenSize={screenSize}
          label="Planks"
          value={resources.planks}
          delta={changes.planks}
          danger={!!shortages?.planks}
          icon={resourceIcons.planks}
          variant={variant}
        />
        <ResourceItem
          screenSize={screenSize}
          label="Coin"
          value={resources.coin}
          delta={changes.coin}
          danger={!!shortages?.coin}
          icon={resourceIcons.coin}
          variant={variant}
        />
        <ResourceItem
          screenSize={screenSize}
          label="Mana"
          value={resources.mana}
          delta={changes.mana}
          danger={!!shortages?.mana}
          icon={resourceIcons.mana}
          variant={variant}
        />
        <ResourceItem
          screenSize={screenSize}
          label="Favor"
          value={resources.favor}
          delta={changes.favor}
          danger={!!shortages?.favor}
          icon={resourceIcons.favor}
          variant={variant}
        />
        <ResourceItem
          screenSize={screenSize}
          label="Unrest"
          value={resources.unrest}
          delta={changes.unrest}
          danger={resources.unrest >= 80}
          icon={resourceIcons.unrest}
          variant={variant}
        />
        <ResourceItem
          screenSize={screenSize}
          label="Threat"
          value={resources.threat}
          delta={changes.threat}
          danger={resources.threat >= 70}
          icon={resourceIcons.threat}
          variant={variant}
        />
      </div>

      <WorkforceSection workforce={workforce} variant={variant} screenSize={screenSize} />
    </ResponsivePanel>
  );
}

export default ModularResourcePanel;
