import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LayoutPreset } from '@/lib/preferences';

// HUD Zone definitions
export type HUDZone = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'sidebar-left' | 'sidebar-right'
  | 'overlay';

// Responsive breakpoints
export interface ResponsiveBreakpoints {
  mobile: number;    // 0-767px
  tablet: number;    // 768-1023px
  desktop: number;   // 1024-1439px
  wide: number;      // 1440px+
}

export const DEFAULT_BREAKPOINTS: ResponsiveBreakpoints = {
  mobile: 767,
  tablet: 1023,
  desktop: 1439,
  wide: 1440
};

// Layout configuration for different screen sizes
export interface HUDLayoutConfig {
  zones: Record<HUDZone, {
    enabled: boolean;
    className: string;
    maxPanels?: number;
    priority?: number; // Higher priority zones get preference on smaller screens
  }>;
  responsive: {
    mobile: HUDZone[];
    tablet: HUDZone[];
    desktop: HUDZone[];
    wide: HUDZone[];
  };
}

// Predefined layout configurations
export const HUD_LAYOUTS: Record<LayoutPreset | string, HUDLayoutConfig> = {
  compact: {
    zones: {
      'top-left': { enabled: false, className: '' },
      'top-center': { enabled: true, className: 'absolute top-4 left-1/2 -translate-x-1/2 z-40', maxPanels: 1, priority: 10 },
      'top-right': { enabled: true, className: 'absolute top-4 right-4 z-40', maxPanels: 2, priority: 9 },
      'middle-left': { enabled: false, className: '' },
      'middle-center': { enabled: false, className: '' },
      'middle-right': { enabled: true, className: 'absolute right-4 top-1/2 -translate-y-1/2 z-40', maxPanels: 1, priority: 8 },
      'bottom-left': { enabled: false, className: '' },
      'bottom-center': { enabled: true, className: 'absolute bottom-4 left-1/2 -translate-x-1/2 z-40', maxPanels: 1, priority: 7 },
      'bottom-right': { enabled: false, className: '' },
      'sidebar-left': { enabled: false, className: '' },
      'sidebar-right': { enabled: true, className: 'flex flex-col gap-2 p-4 h-full overflow-y-auto', maxPanels: 10, priority: 6 },
      'overlay': { enabled: true, className: 'absolute inset-0 z-50 pointer-events-none', priority: 11 }
    },
    responsive: {
      mobile: ['sidebar-right', 'overlay'],
      tablet: ['top-center', 'sidebar-right', 'overlay'],
      desktop: ['top-center', 'top-right', 'middle-right', 'sidebar-right', 'overlay'],
      wide: ['top-center', 'top-right', 'middle-right', 'bottom-center', 'sidebar-right', 'overlay']
    }
  },
  expanded: {
    zones: {
      'top-left': { enabled: true, className: 'absolute top-4 left-4 z-40', maxPanels: 2, priority: 8 },
      'top-center': { enabled: true, className: 'absolute top-4 left-1/2 -translate-x-1/2 z-40', maxPanels: 1, priority: 10 },
      'top-right': { enabled: true, className: 'absolute top-4 right-4 z-40', maxPanels: 2, priority: 9 },
      'middle-left': { enabled: true, className: 'absolute left-4 top-1/2 -translate-y-1/2 z-40', maxPanels: 2, priority: 7 },
      'middle-center': { enabled: false, className: '' },
      'middle-right': { enabled: true, className: 'absolute right-4 top-1/2 -translate-y-1/2 z-40', maxPanels: 2, priority: 6 },
      'bottom-left': { enabled: true, className: 'absolute bottom-4 left-4 z-40', maxPanels: 2, priority: 5 },
      'bottom-center': { enabled: true, className: 'absolute bottom-4 left-1/2 -translate-x-1/2 z-40', maxPanels: 1, priority: 4 },
      'bottom-right': { enabled: true, className: 'absolute bottom-4 right-4 z-40', maxPanels: 2, priority: 3 },
      'sidebar-left': { enabled: false, className: '' },
      'sidebar-right': { enabled: true, className: 'flex flex-col gap-2 p-4 h-full overflow-y-auto', maxPanels: 10, priority: 2 },
      'overlay': { enabled: true, className: 'absolute inset-0 z-50 pointer-events-none', priority: 11 }
    },
    responsive: {
      mobile: ['sidebar-right', 'overlay'],
      tablet: ['top-center', 'bottom-center', 'sidebar-right', 'overlay'],
      desktop: ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-center', 'sidebar-right', 'overlay'],
      wide: ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right', 'sidebar-right', 'overlay']
    }
  }
};

// Screen size detection
export type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'wide';

export function useScreenSize(breakpoints: ResponsiveBreakpoints = DEFAULT_BREAKPOINTS): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width <= breakpoints.mobile) {
        setScreenSize('mobile');
      } else if (width <= breakpoints.tablet) {
        setScreenSize('tablet');
      } else if (width <= breakpoints.desktop) {
        setScreenSize('desktop');
      } else {
        setScreenSize('wide');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, [breakpoints]);

  return screenSize;
}

// HUD Layout Context
interface HUDLayoutContextType {
  layout: HUDLayoutConfig;
  screenSize: ScreenSize;
  activeZones: HUDZone[];
  registerPanel: (zone: HUDZone, panelId: string, priority?: number) => boolean;
  unregisterPanel: (zone: HUDZone, panelId: string) => void;
  getPanelsInZone: (zone: HUDZone) => string[];
}

const HUDLayoutContext = createContext<HUDLayoutContextType | null>(null);

export function useHUDLayout() {
  const context = useContext(HUDLayoutContext);
  if (!context) {
    throw new Error('useHUDLayout must be used within a HUDLayoutProvider');
  }
  return context;
}

// HUD Layout Provider
interface HUDLayoutProviderProps {
  children: ReactNode;
  layoutPreset: LayoutPreset | string;
  customLayout?: HUDLayoutConfig;
  breakpoints?: ResponsiveBreakpoints;
}

export function HUDLayoutProvider({ 
  children, 
  layoutPreset, 
  customLayout,
  breakpoints = DEFAULT_BREAKPOINTS 
}: HUDLayoutProviderProps) {
  const screenSize = useScreenSize(breakpoints);
  const layout = customLayout || HUD_LAYOUTS[layoutPreset] || HUD_LAYOUTS.compact;
  const activeZones = layout.responsive[screenSize];
  
  // Panel registry for each zone
  const [panelRegistry, setPanelRegistry] = useState<Record<HUDZone, Array<{ id: string; priority: number }>>>(
    Object.keys(layout.zones).reduce((acc, zone) => {
      acc[zone as HUDZone] = [];
      return acc;
    }, {} as Record<HUDZone, Array<{ id: string; priority: number }>>)
  );

  const registerPanel = (zone: HUDZone, panelId: string, priority = 0): boolean => {
    const zoneConfig = layout.zones[zone];
    if (!zoneConfig.enabled || !activeZones.includes(zone)) {
      return false;
    }

    setPanelRegistry(prev => {
      const zonePanels = prev[zone] || [];
      const maxPanels = zoneConfig.maxPanels || Infinity;
      
      // Check if panel already exists
      if (zonePanels.some(p => p.id === panelId)) {
        return prev;
      }

      // Check capacity
      if (zonePanels.length >= maxPanels) {
        return prev;
      }

      // Add panel and sort by priority
      const newPanels = [...zonePanels, { id: panelId, priority }]
        .sort((a, b) => b.priority - a.priority);

      return {
        ...prev,
        [zone]: newPanels
      };
    });

    return true;
  };

  const unregisterPanel = (zone: HUDZone, panelId: string) => {
    setPanelRegistry(prev => ({
      ...prev,
      [zone]: (prev[zone] || []).filter(p => p.id !== panelId)
    }));
  };

  const getPanelsInZone = (zone: HUDZone): string[] => {
    return (panelRegistry[zone] || []).map(p => p.id);
  };

  const contextValue: HUDLayoutContextType = {
    layout,
    screenSize,
    activeZones,
    registerPanel,
    unregisterPanel,
    getPanelsInZone
  };

  return (
    <HUDLayoutContext.Provider value={contextValue}>
      {children}
    </HUDLayoutContext.Provider>
  );
}

// HUD Zone Container Component
interface HUDZoneProps {
  zone: HUDZone;
  children?: ReactNode;
  className?: string;
}

export function HUDZone({ zone, children, className = '' }: HUDZoneProps) {
  const { layout, activeZones } = useHUDLayout();
  
  const zoneConfig = layout.zones[zone];
  if (!zoneConfig.enabled || !activeZones.includes(zone)) {
    return null;
  }

  const combinedClassName = `${zoneConfig.className} ${className}`.trim();

  return (
    <div className={combinedClassName} data-hud-zone={zone}>
      {children}
    </div>
  );
}

// HUD Container Component
interface HUDContainerProps {
  children: ReactNode;
  className?: string;
}

export function HUDContainer({ children, className = '' }: HUDContainerProps) {
  return (
    <div className={`relative w-full h-full pointer-events-none ${className}`} data-hud-container>
      {children}
    </div>
  );
}