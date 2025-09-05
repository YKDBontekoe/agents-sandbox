import React, { ReactNode } from 'react';
import { HUDLayoutProvider, HUDContainer, HUDZone } from './HUDLayoutSystem';
import { HUDPanelRegistryProvider } from './HUDPanelRegistry';
import { HUDLayoutPresetProvider, useHUDLayoutPresets } from './HUDLayoutPresets';
import { HUDAccessibilityProvider } from './HUDAccessibility';
import { LayoutPreset } from '@/lib/preferences';
import './hud-accessibility.css';

// Import modular panels
import { ModularResourcePanel } from './panels/ModularResourcePanel';
import { ModularTimePanel } from './panels/ModularTimePanel';
import { ModularActionPanel } from './panels/ModularActionPanel';
import { ModularMiniMapPanel } from './panels/ModularMiniMapPanel';
import { ModularSkillTreePanel } from './panels/ModularSkillTreePanel';

// Integrated HUD System Props
interface IntegratedHUDSystemProps {
  children?: ReactNode;
  defaultPreset?: string;
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
    };
  };
  onGameAction: (action: string, data?: any) => void;
  className?: string;
}

// HUD System Core Component
function HUDSystemCore({ 
  children, 
  gameData, 
  onGameAction, 
  className = '' 
}: Omit<IntegratedHUDSystemProps, 'defaultPreset'>) {
  const { currentPreset } = useHUDLayoutPresets();
  // Expose sidebar width as CSS variable for safe-area aware overlays
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
    <HUDLayoutProvider 
      layoutPreset={currentPreset.id as LayoutPreset}
      customLayout={currentPreset.layout}
    >
      <HUDPanelRegistryProvider>
        <HUDContainer className={`integrated-hud-system ${className}`}>
          {/* Right Sidebar: stack all primary panels to prevent overlap */}
          <HUDZone zone="sidebar-right">
            {/* Subtle left-edge gradient for depth */}
            <div className="relative">
              <div className="pointer-events-none absolute left-0 top-0 h-full w-2 bg-gradient-to-l from-black/10 to-transparent" />
            </div>
            {/* Smart, uncluttered sidebar: no manual density buttons; panels self-adapt */}
            <div className="mt-1" />
            <ModularResourcePanel
              resources={gameData.resources}
              changes={gameData.resourceChanges}
              workforce={gameData.workforce}
              variant={currentPreset.panelVariants.resources || 'default'}
            />
            <div className="mt-2" />
            <ModularTimePanel
              time={gameData.time}
              isPaused={gameData.time.isPaused}
              onPause={() => onGameAction('pause')}
              onResume={() => onGameAction('resume')}
              onAdvanceCycle={() => onGameAction('advance-cycle')}
              variant={currentPreset.panelVariants['time-panel'] || 'default'}
            />
            <div className="mt-2" />
            <ModularMiniMapPanel gridSize={20} />
            <div className="mt-2" />
            <ModularActionPanel
              onOpenCouncil={() => onGameAction('open-council')}
              onOpenEdicts={() => onGameAction('open-edicts')}
              onOpenOmens={() => onGameAction('open-omens')}
              onOpenSettings={() => onGameAction('open-settings')}
              variant={currentPreset.panelVariants['action-panel'] || 'default'}
            />
            <div className="mt-2" />
            <ModularSkillTreePanel />

            {/* Inject additional right-sidebar children (e.g., Worker/Quest panels) */}
            <div className="mt-2" />
            {children}
          </HUDZone>

          {/* Additional content outside the sidebar can be added via zones if needed */}
        </HUDContainer>
      </HUDPanelRegistryProvider>
    </HUDLayoutProvider>
  );
}

// Main Integrated HUD System Component
export function IntegratedHUDSystem({
  children,
  defaultPreset = 'default',
  gameData,
  onGameAction,
  className
}: IntegratedHUDSystemProps) {
  return (
    <HUDAccessibilityProvider>
      <HUDLayoutPresetProvider defaultPreset={defaultPreset}>
        <HUDSystemCore
          gameData={gameData}
          onGameAction={onGameAction}
          className={className}
        >
          {children}
        </HUDSystemCore>
      </HUDLayoutPresetProvider>
    </HUDAccessibilityProvider>
  );
}

// HUD Settings Panel for runtime configuration
interface HUDSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HUDSettingsPanel({ isOpen, onClose }: HUDSettingsPanelProps) {
  const { availablePresets, currentPreset, setPreset } = useHUDLayoutPresets();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">HUD Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Layout Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availablePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setPreset(preset.id)}
                  className={`
                    p-3 rounded border text-left transition-colors
                    ${currentPreset.id === preset.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2">
                    {preset.icon && (
                      <div className="w-4 h-4 text-gray-600 dark:text-gray-400">
                        {preset.icon}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-sm">{preset.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {preset.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium mb-2">Features</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {currentPreset.features.autoHide && (
                <div>• Auto-hide panels when not in use</div>
              )}
              {currentPreset.features.smartCollapse && (
                <div>• Smart panel collapsing on small screens</div>
              )}
              {currentPreset.features.contextualPanels && (
                <div>• Context-aware panel visibility</div>
              )}
              {currentPreset.features.adaptiveLayout && (
                <div>• Adaptive layout for different screen sizes</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for accessing the integrated HUD system
export function useIntegratedHUD() {
  return {
    presets: useHUDLayoutPresets(),
    // Add other HUD system hooks as needed
  };
}


// Example usage component
export function HUDSystemExample() {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  
  // Mock game data
  const gameData = {
    resources: {
      grain: 850,
      coin: 1200,
      mana: 45,
      favor: 75,
      wood: 120,
      planks: 80,
      unrest: 25,
      threat: 15
    },
    resourceChanges: {
      grain: 12,
      coin: -8,
      mana: 3,
      favor: -2,
      wood: 5,
      planks: 2,
      unrest: 1,
      threat: 0
    },
    workforce: {
      total: 120,
      idle: 25,
      needed: 95
    },
    time: {
      cycle: 42,
      season: 'Spring',
      timeRemaining: 180,
      isPaused: false
    }
  };

  const handleGameAction = (action: string, data?: any) => {
    console.log('Game action:', action, data);
    
    if (action === 'open-settings') {
      setSettingsOpen(true);
    }
  };

  return (
    <HUDLayoutPresetProvider defaultPreset="default">
      <div className="w-full h-screen bg-green-100 relative">
        {/* Game content area */}
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-gray-600">
            <h1 className="text-2xl font-bold mb-2">Game World</h1>
            <p>This is where your game content would be displayed.</p>
            <p className="text-sm mt-2">The HUD system overlays on top without interfering.</p>
          </div>
        </div>
        
        {/* Integrated HUD System */}
        <IntegratedHUDSystem
          defaultPreset="default"
          gameData={gameData}
          onGameAction={handleGameAction}
          className="absolute inset-0 pointer-events-none"
        />
        
        {/* Settings Panel */}
        <HUDSettingsPanel
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
    </HUDLayoutPresetProvider>
  );
}

export default IntegratedHUDSystem;
