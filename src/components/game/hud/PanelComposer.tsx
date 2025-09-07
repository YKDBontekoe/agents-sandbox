import React, { ReactNode } from 'react';
import { HUDContainer, HUDZone } from './HUDLayoutSystem';
import { useHUDLayoutPresets } from './HUDLayoutPresets';
import { ModularResourcePanel } from './panels/ModularResourcePanel';
import { TimeControlPanel } from '../TimeControlPanel';
import { ModularActionPanel } from './panels/ModularActionPanel';
import { ModularMiniMapPanel } from './panels/ModularMiniMapPanel';
import { ModularSkillTreePanel } from './panels/ModularSkillTreePanel';
import CityManagementPanel, {
  CityStats,
  ManagementTool,
  ZoneType,
  ServiceType,
} from '../CityManagementPanel';

export interface PanelComposerProps {
  children?: ReactNode;
  gameData: {
    resources: {
      grain: number;
      coin: number;
      mana: number;
      favor: number;
      wood: number;
      planks: number;
      unrest: number;
      threat: number;
    };
    resourceChanges: {
      grain: number;
      coin: number;
      mana: number;
      favor: number;
      wood: number;
      planks: number;
      unrest: number;
      threat: number;
    };
    workforce: {
      total: number;
      idle: number;
      needed: number;
    };
    time: {
      cycle: number;
      season: string;
      timeRemaining: number;
      isPaused: boolean;
      intervalMs?: number;
    };
  };
  cityManagement?: {
    stats: CityStats;
    selectedTool: ManagementTool;
    onToolSelect: (tool: ManagementTool) => void;
    selectedZoneType: ZoneType;
    onZoneTypeSelect: (zoneType: ZoneType) => void;
    selectedServiceType: ServiceType;
    onServiceTypeSelect: (serviceType: ServiceType) => void;
    isSimulationRunning: boolean;
    onToggleSimulation: () => void;
    onResetCity?: () => void;
    isOpen?: boolean;
    onClose?: () => void;
  };
  onGameAction: (action: string, data?: unknown) => void;
  className?: string;
}

export function PanelComposer({
  children,
  gameData,
  onGameAction,
  cityManagement,
  className = '',
}: PanelComposerProps) {
  const { currentPreset } = useHUDLayoutPresets();

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateVar = () => {
      const el = document.querySelector('[data-hud-zone="sidebar-right"]') as HTMLElement | null;
      const w = el ? el.offsetWidth : 0;
      document.documentElement.style.setProperty('--hud-right-rail', w ? `${w}px` : '0px');
    };
    updateVar();
    const ro = new ResizeObserver(updateVar);
    const el = document.querySelector('[data-hud-zone="sidebar-right"]') as HTMLElement | null;
    if (el) ro.observe(el);
    window.addEventListener('resize', updateVar);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateVar);
    };
  }, []);

  return (
    <HUDContainer className={`integrated-hud-system ${className}`}>
      <HUDZone zone="sidebar-right">
        <div className="relative">
          <div className="pointer-events-none absolute left-0 top-0 h-full w-2 bg-gradient-to-l from-black/10 to-transparent" />
          <div className="pointer-events-none sticky top-0 h-4 -mt-4 bg-gradient-to-b from-black/10 to-transparent" />
          <div className="pointer-events-none sticky bottom-0 h-4 -mb-4 bg-gradient-to-t from-black/10 to-transparent" />
        </div>
        <div className="mt-1" />
        {cityManagement ? (
          <CityManagementPanel
            isOpen={cityManagement.isOpen ?? true}
            onClose={cityManagement.onClose ?? (() => {})}
            stats={cityManagement.stats}
            selectedTool={cityManagement.selectedTool}
            onToolSelect={cityManagement.onToolSelect}
            selectedZoneType={cityManagement.selectedZoneType}
            onZoneTypeSelect={cityManagement.onZoneTypeSelect}
            selectedServiceType={cityManagement.selectedServiceType}
            onServiceTypeSelect={cityManagement.onServiceTypeSelect}
            isSimulationRunning={cityManagement.isSimulationRunning}
            onToggleSimulation={cityManagement.onToggleSimulation}
            onResetCity={cityManagement.onResetCity}
          />
        ) : (
          <ModularResourcePanel
            resources={gameData.resources}
            changes={gameData.resourceChanges}
            workforce={gameData.workforce}
            variant={currentPreset.panelVariants.resources || 'default'}
          />
        )}
        <div className="mt-2" />
        <TimeControlPanel className="w-full" />
        <div className="mt-2" />
        <ModularMiniMapPanel gridSize={20} />
        <div className="mt-2" />
        <ModularActionPanel
          onOpenCouncil={() => onGameAction('open-council')}
          onOpenEdicts={() => onGameAction('open-edicts')}
          onOpenOmens={() => onGameAction('open-omens')}
          onOpenSettings={() => onGameAction('open-settings')}
          intervalMs={gameData.time.intervalMs}
          onChangeIntervalMs={(ms) => onGameAction('set-speed', { ms })}
          variant={currentPreset.panelVariants['action-panel'] || 'default'}
        />
        <div className="mt-2" />
        <ModularSkillTreePanel
          resources={{
            coin: gameData.resources.coin,
            mana: gameData.resources.mana,
            favor: gameData.resources.favor,
          }}
        />
        <div className="mt-2" />
        {children}
      </HUDZone>
    </HUDContainer>
  );
}

export default PanelComposer;
