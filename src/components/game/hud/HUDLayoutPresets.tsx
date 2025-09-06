import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HUDZone, HUDLayoutConfig, ResponsiveBreakpoints } from './HUDLayoutSystem';
import { HUDPanelConfig } from './HUDPanelRegistry';

// Layout preset interface
export interface HUDLayoutPreset {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  layout: HUDLayoutConfig;
  panelConfigs: Record<string, Partial<HUDPanelConfig>>;
  panelVariants: Record<string, 'default' | 'compact' | 'minimal'>;
  features: {
    autoHide?: boolean;
    smartCollapse?: boolean;
    contextualPanels?: boolean;
    adaptiveLayout?: boolean;
  };
}

// Preset context
interface HUDLayoutPresetContextType {
  currentPreset: HUDLayoutPreset;
  availablePresets: HUDLayoutPreset[];
  setPreset: (presetId: string) => void;
  customizePreset: (presetId: string, customizations: Partial<HUDLayoutPreset>) => void;
  resetPreset: (presetId: string) => void;
  createCustomPreset: (preset: HUDLayoutPreset) => void;
  deleteCustomPreset: (presetId: string) => void;
}

const HUDLayoutPresetContext = createContext<HUDLayoutPresetContextType | null>(null);

export function useHUDLayoutPresets() {
  const context = useContext(HUDLayoutPresetContext);
  if (!context) {
    throw new Error('useHUDLayoutPresets must be used within a HUDLayoutPresetProvider');
  }
  return context;
}

// Default presets
const DEFAULT_PRESETS: HUDLayoutPreset[] = [
  {
    id: 'default',
    name: 'Default Layout',
    description: 'Balanced layout with all panels visible and accessible',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    layout: {
      zones: {
        'top-left': { enabled: true, className: 'absolute top-4 left-4 z-40', maxPanels: 2, priority: 8 },
        'top-center': { enabled: true, className: 'absolute top-4 left-1/2 -translate-x-1/2 z-40', maxPanels: 1, priority: 10 },
        'top-right': { enabled: false, className: '' },
        'middle-left': { enabled: true, className: 'absolute left-4 top-1/2 -translate-y-1/2 z-40', maxPanels: 2, priority: 7 },
        'middle-center': { enabled: false, className: '' },
        'middle-right': { enabled: false, className: '' },
        'bottom-left': { enabled: true, className: 'absolute bottom-4 left-4 z-40', maxPanels: 2, priority: 5 },
        'bottom-center': { enabled: true, className: 'absolute bottom-4 left-1/2 -translate-x-1/2 z-40', maxPanels: 1, priority: 4 },
        'bottom-right': { enabled: true, className: 'absolute bottom-4 right-4 z-40', maxPanels: 2, priority: 3 },
        'sidebar-left': { enabled: false, className: '' },
        'sidebar-right': { enabled: true, className: 'absolute top-0 right-0 h-full w-[300px] md:w-[340px] lg:w-[360px] flex flex-col gap-2 md:gap-3 p-3 md:p-4 overflow-y-auto z-40 bg-gray-900/30 backdrop-blur-md border-l border-gray-800', maxPanels: 12, priority: 2 },
        'overlay': { enabled: true, className: 'absolute inset-0 z-50 pointer-events-none', priority: 11 }
      },
      responsive: {
        mobile: ['sidebar-right', 'overlay'],
        tablet: ['top-center', 'bottom-center', 'sidebar-right', 'overlay'],
        desktop: ['top-left', 'top-center', 'middle-left', 'bottom-center', 'sidebar-right', 'overlay'],
        wide: ['top-left', 'top-center', 'bottom-left', 'bottom-center', 'bottom-right', 'sidebar-right', 'overlay']
      }
    },
    panelConfigs: {
      'resources': { priority: 10, persistent: true },
      'time-panel': { priority: 9, persistent: true },
      'action-panel': { priority: 8 },
      'status-bar': { priority: 7 },
      'top-bar': { priority: 11, persistent: true }
    },
    panelVariants: {
      'resources': 'default',
      'time-panel': 'compact',
      'action-panel': 'compact',
      'status-bar': 'default',
      'top-bar': 'default'
    },
    features: {
      autoHide: false,
      smartCollapse: true,
      contextualPanels: false,
      adaptiveLayout: true
    }
  },
  {
    id: 'compact',
    name: 'Compact Layout',
    description: 'Space-efficient layout with smaller panels and smart collapsing',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    layout: {
      zones: {
        'top-left': { enabled: false, className: '' },
        'top-center': { enabled: true, className: 'absolute top-4 left-1/2 -translate-x-1/2 z-40', maxPanels: 1, priority: 10 },
        'top-right': { enabled: false, className: '' },
        'middle-left': { enabled: false, className: '' },
        'middle-center': { enabled: false, className: '' },
        'middle-right': { enabled: false, className: '' },
        'bottom-left': { enabled: false, className: '' },
        'bottom-center': { enabled: true, className: 'absolute bottom-4 left-1/2 -translate-x-1/2 z-40', maxPanels: 1, priority: 7 },
        'bottom-right': { enabled: false, className: '' },
        'sidebar-left': { enabled: false, className: '' },
        'sidebar-right': { enabled: true, className: 'absolute top-0 right-0 h-full w-[300px] md:w-[340px] lg:w-[360px] flex flex-col gap-2 md:gap-3 p-3 md:p-4 overflow-y-auto z-40 bg-gray-900/30 backdrop-blur-md border-l border-gray-800', maxPanels: 12, priority: 6 },
        'overlay': { enabled: true, className: 'absolute inset-0 z-50 pointer-events-none', priority: 11 }
      },
      responsive: {
        mobile: ['sidebar-right', 'overlay'],
        tablet: ['top-center', 'sidebar-right', 'overlay'],
        desktop: ['top-center', 'sidebar-right', 'overlay'],
        wide: ['top-center', 'bottom-center', 'sidebar-right', 'overlay']
      }
    },
    panelConfigs: {
      'resources': { priority: 10, persistent: true },
      'time-panel': { priority: 9, persistent: true, responsive: { collapseOnMobile: true } },
      'action-panel': { priority: 8, responsive: { hideOnMobile: true } }
    },
    panelVariants: {
      'resources': 'compact',
      'time-panel': 'compact',
      'action-panel': 'compact'
    },
    features: {
      autoHide: true,
      smartCollapse: true,
      contextualPanels: true,
      adaptiveLayout: true
    }
  },
  {
    id: 'minimal',
    name: 'Minimal Layout',
    description: 'Clean, distraction-free layout with only essential information',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
    layout: {
      zones: {
        'top-left': { enabled: false, className: '' },
        'top-center': { enabled: false, className: '' },
        'top-right': { enabled: false, className: '' },
        'middle-left': { enabled: false, className: '' },
        'middle-center': { enabled: false, className: '' },
        'middle-right': { enabled: false, className: '' },
        'bottom-left': { enabled: false, className: '' },
        'bottom-center': { enabled: false, className: '' },
        'bottom-right': { enabled: false, className: '' },
        'sidebar-left': { enabled: false, className: '' },
        'sidebar-right': { enabled: true, className: 'absolute top-0 right-0 h-full w-[280px] md:w-[300px] lg:w-[320px] flex flex-col gap-2 md:gap-3 p-3 overflow-y-auto z-40 bg-gray-900/30 backdrop-blur-md border-l border-gray-800', maxPanels: 8, priority: 6 },
        'overlay': { enabled: true, className: 'absolute inset-0 z-50 pointer-events-none', priority: 11 }
      },
      responsive: {
        mobile: ['sidebar-right', 'overlay'],
        tablet: ['sidebar-right', 'overlay'],
        desktop: ['sidebar-right', 'overlay'],
        wide: ['sidebar-right', 'overlay']
      }
    },
    panelConfigs: {
      'resources': { priority: 10, persistent: true },
      'time-panel': { priority: 9, persistent: true },
      'action-panel': { priority: 8 }
    },
    panelVariants: {
      'resources': 'minimal',
      'time-panel': 'minimal',
      'action-panel': 'minimal'
    },
    features: {
      autoHide: true,
      smartCollapse: false,
      contextualPanels: false,
      adaptiveLayout: true
    }
  },
  {
    id: 'immersive',
    name: 'Immersive Layout',
    description: 'Maximum screen space for gameplay with auto-hiding panels',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    layout: {
      zones: {
        'top-left': { enabled: false, className: '' },
        'top-center': { enabled: false, className: '' },
        'top-right': { enabled: false, className: '' },
        'middle-left': { enabled: false, className: '' },
        'middle-center': { enabled: false, className: '' },
        'middle-right': { enabled: false, className: '' },
        'bottom-left': { enabled: false, className: '' },
        'bottom-center': { enabled: false, className: '' },
        'bottom-right': { enabled: false, className: '' },
        'sidebar-left': { enabled: false, className: '' },
        'sidebar-right': { enabled: true, className: 'absolute top-0 right-0 h-full w-[280px] md:w-[300px] lg:w-[320px] flex flex-col gap-2 md:gap-3 p-3 overflow-y-auto z-40 bg-gray-900/30 backdrop-blur-md border-l border-gray-800', maxPanels: 6, priority: 6 },
        'overlay': { enabled: true, className: 'absolute inset-0 z-50 pointer-events-none', priority: 11 }
      },
      responsive: {
        mobile: ['overlay'],
        tablet: ['sidebar-right', 'overlay'],
        desktop: ['sidebar-right', 'overlay'],
        wide: ['sidebar-right', 'overlay']
      }
    },
    panelConfigs: {
      'resources': { priority: 10, persistent: false },
      'time-panel': { priority: 9, persistent: true }
    },
    panelVariants: {
      'resources': 'minimal',
      'time-panel': 'minimal'
    },
    features: {
      autoHide: true,
      smartCollapse: false,
      contextualPanels: true,
      adaptiveLayout: true
    }
  }
];

interface HUDLayoutPresetProviderProps {
  children: ReactNode;
  defaultPreset?: string;
}

export function HUDLayoutPresetProvider({ children, defaultPreset = 'default' }: HUDLayoutPresetProviderProps) {
  const [presets, setPresets] = useState<HUDLayoutPreset[]>(DEFAULT_PRESETS);
  const [currentPresetId, setCurrentPresetId] = useState(defaultPreset);
  const [customPresets, setCustomPresets] = useState<HUDLayoutPreset[]>([]);

  // Load custom presets from localStorage on mount
  useEffect(() => {
    const savedPresets = localStorage.getItem('hud-custom-presets');
    if (savedPresets) {
      try {
        const parsed = JSON.parse(savedPresets);
        setCustomPresets(parsed);
      } catch (error) {
        console.warn('Failed to load custom HUD presets:', error);
      }
    }

    const savedCurrentPreset = localStorage.getItem('hud-current-preset');
    if (savedCurrentPreset) {
      setCurrentPresetId(savedCurrentPreset);
    }
  }, []);

  // Save custom presets to localStorage
  useEffect(() => {
    localStorage.setItem('hud-custom-presets', JSON.stringify(customPresets));
  }, [customPresets]);

  // Save current preset to localStorage
  useEffect(() => {
    localStorage.setItem('hud-current-preset', currentPresetId);
  }, [currentPresetId]);

  const allPresets = [...presets, ...customPresets];
  const currentPreset = allPresets.find(p => p.id === currentPresetId) || presets[0];

  const setPreset = (presetId: string) => {
    const preset = allPresets.find(p => p.id === presetId);
    if (preset) {
      setCurrentPresetId(presetId);
    }
  };

  const customizePreset = (presetId: string, customizations: Partial<HUDLayoutPreset>) => {
    const preset = allPresets.find(p => p.id === presetId);
    if (preset) {
      const customizedPreset = { ...preset, ...customizations };
      
      if (presets.find(p => p.id === presetId)) {
        // If it's a default preset, create a new custom preset
        const newPreset = {
          ...customizedPreset,
          id: `${presetId}-custom-${Date.now()}`,
          name: `${preset.name} (Custom)`
        };
        setCustomPresets(prev => [...prev, newPreset]);
        setCurrentPresetId(newPreset.id);
      } else {
        // If it's already a custom preset, update it
        setCustomPresets(prev => prev.map(p => p.id === presetId ? customizedPreset : p));
      }
    }
  };

  const resetPreset = (presetId: string) => {
    const originalPreset = DEFAULT_PRESETS.find(p => p.id === presetId);
    if (originalPreset) {
      setCustomPresets(prev => prev.filter(p => !p.id.startsWith(`${presetId}-custom`)));
      setCurrentPresetId(presetId);
    }
  };

  const createCustomPreset = (preset: HUDLayoutPreset) => {
    setCustomPresets(prev => [...prev, preset]);
  };

  const deleteCustomPreset = (presetId: string) => {
    setCustomPresets(prev => prev.filter(p => p.id !== presetId));
    if (currentPresetId === presetId) {
      setCurrentPresetId('default');
    }
  };

  const contextValue: HUDLayoutPresetContextType = {
    currentPreset,
    availablePresets: allPresets,
    setPreset,
    customizePreset,
    resetPreset,
    createCustomPreset,
    deleteCustomPreset
  };

  return (
    <HUDLayoutPresetContext.Provider value={contextValue}>
      {children}
    </HUDLayoutPresetContext.Provider>
  );
}

export default HUDLayoutPresetProvider;
