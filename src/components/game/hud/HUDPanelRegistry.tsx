import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { HUDZone, useHUDLayout } from './HUDLayoutSystem';

// Panel configuration interface
export interface HUDPanelConfig {
  id: string;
  zone: HUDZone;
  priority?: number;
  persistent?: boolean; // Whether panel should persist across layout changes
  responsive?: {
    hideOnMobile?: boolean;
    hideOnTablet?: boolean;
    collapseOnMobile?: boolean;
  };
  accessibility?: {
    ariaLabel?: string;
    role?: string;
    tabIndex?: number;
  };
  animation?: {
    enter?: string;
    exit?: string;
    duration?: number;
  };
}

// Panel component interface
export interface HUDPanelComponent<P extends object = Record<string, never>> {
  config: HUDPanelConfig;
  component: React.ComponentType<P>;
  props?: Partial<P>;
  isVisible?: boolean;
  isCollapsed?: boolean;
}

type HUDPanelRegistryEntry<P extends object = Record<string, never>> = HUDPanelComponent<P> & {
  isVisible: boolean;
  isCollapsed: boolean;
};

type AnyHUDPanelRegistryEntry = HUDPanelRegistryEntry<object>;

type HUDPanelUpdate<P extends object = Record<string, never>> = Partial<
  Pick<HUDPanelRegistryEntry<P>, 'props' | 'isVisible' | 'isCollapsed'>
>;

// Panel registry context
interface HUDPanelRegistryContextType {
  panels: Map<string, AnyHUDPanelRegistryEntry>;
  registerPanel: <P extends object>(panel: HUDPanelComponent<P>) => void;
  unregisterPanel: (panelId: string) => void;
  updatePanel: <P extends object>(panelId: string, updates: HUDPanelUpdate<P>) => void;
  getPanelsForZone: (zone: HUDZone) => AnyHUDPanelRegistryEntry[];
  togglePanelVisibility: (panelId: string) => void;
  togglePanelCollapse: (panelId: string) => void;
  getPanelById: (panelId: string) => AnyHUDPanelRegistryEntry | undefined;
}

const HUDPanelRegistryContext = createContext<HUDPanelRegistryContextType | null>(null);

export function useHUDPanelRegistry() {
  const context = useContext(HUDPanelRegistryContext);
  if (!context) {
    throw new Error('useHUDPanelRegistry must be used within a HUDPanelRegistryProvider');
  }
  return context;
}

// Panel registry provider
interface HUDPanelRegistryProviderProps {
  children: ReactNode;
}

export function HUDPanelRegistryProvider({ children }: HUDPanelRegistryProviderProps) {
  const [panels, setPanels] = useState<Map<string, AnyHUDPanelRegistryEntry>>(new Map());
  const { screenSize, layout, registerPanel: registerLayoutPanel, unregisterPanel: unregisterLayoutPanel, getPanelsInZone } = useHUDLayout();

  const registerPanel = useCallback(<P extends object>(panel: HUDPanelComponent<P>) => {
    const { config } = panel;

    // Check responsive visibility
    const shouldHide =
      (screenSize === 'mobile' && config.responsive?.hideOnMobile) ||
      (screenSize === 'tablet' && config.responsive?.hideOnTablet);

    const shouldCollapse = Boolean(
      screenSize === 'mobile' && config.responsive?.collapseOnMobile
    );

    const panelWithState: HUDPanelRegistryEntry<P> = {
      ...panel,
      isVisible: panel.isVisible ?? !shouldHide,
      isCollapsed: panel.isCollapsed ?? shouldCollapse
    };

    setPanels(prev => {
      const newPanels = new Map(prev);
      newPanels.set(config.id, panelWithState as AnyHUDPanelRegistryEntry);
      return newPanels;
    });

    // Do not register with layout here; defer to effect to avoid updates during render
  }, [screenSize]);

  const unregisterPanel = useCallback((panelId: string) => {
    // Only update local registry here; layout reconciliation effect will handle unregistering
    setPanels(prev => {
      if (!prev.has(panelId)) return prev;
      const newPanels = new Map(prev);
      newPanels.delete(panelId);
      return newPanels;
    });
  }, []);

  const updatePanel = useCallback(<P extends object>(panelId: string, updates: HUDPanelUpdate<P>) => {
    setPanels(prev => {
      const panel = prev.get(panelId);
      if (!panel) return prev;

      const newPanels = new Map(prev);
      newPanels.set(panelId, { ...panel, ...updates } as AnyHUDPanelRegistryEntry);
      return newPanels;
    });
  }, []);

  const getPanelsForZone = useCallback((zone: HUDZone): AnyHUDPanelRegistryEntry[] => {
    return Array.from(panels.values())
      .filter(panel => panel.config.zone === zone && panel.isVisible)
      .sort((a, b) => (b.config.priority || 0) - (a.config.priority || 0));
  }, [panels]);

  const togglePanelVisibility = useCallback((panelId: string) => {
    const panel = panels.get(panelId);
    if (panel) {
      const newVisibility = !panel.isVisible;
      updatePanel(panelId, { isVisible: newVisibility });
      // Layout registration changes are handled in the reconciliation effect
    }
  }, [panels, updatePanel]);

  const togglePanelCollapse = useCallback((panelId: string) => {
    const panel = panels.get(panelId);
    if (panel) {
      updatePanel(panelId, { isCollapsed: !panel.isCollapsed });
    }
  }, [panels, updatePanel]);

  const getPanelById = useCallback((panelId: string): AnyHUDPanelRegistryEntry | undefined => {
    return panels.get(panelId);
  }, [panels]);

  // Handle responsive changes (only update local panel visibility/collapse)
  useEffect(() => {
    const currentPanels = Array.from(panels.entries());
    currentPanels.forEach(([panelId, panel]) => {
      const { config } = panel;
      const shouldHide =
        (screenSize === 'mobile' && config.responsive?.hideOnMobile) ||
        (screenSize === 'tablet' && config.responsive?.hideOnTablet);

      const shouldCollapse = Boolean(
        screenSize === 'mobile' && config.responsive?.collapseOnMobile
      );

      if (panel.isVisible !== !shouldHide || panel.isCollapsed !== shouldCollapse) {
        setPanels(prev => {
          const newPanels = new Map(prev);
          const currentPanel = newPanels.get(panelId);
          if (currentPanel) {
            newPanels.set(panelId, {
              ...currentPanel,
              isVisible: !shouldHide,
              isCollapsed: shouldCollapse,
            });
          }
          return newPanels;
        });
      }
    });
  }, [screenSize, panels]);

  // Reconcile layout registration after render based on current panels
  useEffect(() => {
    const currentPanels = Array.from(panels.values());

    // 1) Ensure all visible panels are registered, and hidden ones are unregistered
    currentPanels.forEach(panel => {
      const { config, isVisible } = panel;
      const inZone = new Set(getPanelsInZone(config.zone));
      const isRegistered = inZone.has(config.id);
      if (isVisible && !isRegistered) {
        registerLayoutPanel(config.zone, config.id, config.priority);
      } else if (!isVisible && isRegistered) {
        unregisterLayoutPanel(config.zone, config.id);
      }
    });

    // 2) Unregister any layout-registered panels that no longer exist in the registry
    const panelIds = new Set(Array.from(panels.keys()));
    // Check all defined zones (covers zones with zero local panels too)
    const allZones = Object.keys(layout.zones) as HUDZone[];
    allZones.forEach(zone => {
      const registeredIds = getPanelsInZone(zone);
      registeredIds.forEach(id => {
        if (!panelIds.has(id)) {
          unregisterLayoutPanel(zone, id);
        }
      });
    });
  }, [panels, layout.zones, getPanelsInZone, registerLayoutPanel, unregisterLayoutPanel]);

  const contextValue: HUDPanelRegistryContextType = {
    panels,
    registerPanel,
    unregisterPanel,
    updatePanel,
    getPanelsForZone,
    togglePanelVisibility,
    togglePanelCollapse,
    getPanelById
  };

  return (
    <HUDPanelRegistryContext.Provider value={contextValue}>
      {children}
    </HUDPanelRegistryContext.Provider>
  );
}

// Hook for registering panels
export function useHUDPanel<P extends object>(panel: HUDPanelComponent<P>) {
  const { registerPanel, unregisterPanel } = useHUDPanelRegistry();

  const stablePanel = useMemo(() => panel, [panel.config.id, panel.config.zone, panel.config.priority, panel.component]);

  useEffect(() => {
    registerPanel(stablePanel);
    return () => unregisterPanel(stablePanel.config.id);
  }, [stablePanel, registerPanel, unregisterPanel]);
}

// Panel wrapper component
interface HUDPanelWrapperProps {
  panelId: string;
  children?: ReactNode;
  className?: string;
}

export function HUDPanelWrapper({ panelId, children, className = '' }: HUDPanelWrapperProps) {
  const { getPanelById } = useHUDPanelRegistry();
  const panel = getPanelById(panelId);
  
  if (!panel || !panel.isVisible) {
    return null;
  }

  const { config } = panel;
  const animationClass = config.animation?.enter || 'animate-fade-in';
  const collapsedClass = panel.isCollapsed ? 'opacity-50 scale-95' : '';
  
  return (
    <div 
      className={`${animationClass} ${collapsedClass} ${className} transition-all duration-200`}
      role={config.accessibility?.role}
      aria-label={config.accessibility?.ariaLabel}
      tabIndex={config.accessibility?.tabIndex}
      data-panel-id={panelId}
      data-panel-zone={config.zone}
    >
      {children}
    </div>
  );
}

// Auto-rendering zone component
interface HUDAutoZoneProps {
  zone: HUDZone;
  className?: string;
}

export function HUDAutoZone({ zone, className = '' }: HUDAutoZoneProps) {
  const { getPanelsForZone } = useHUDPanelRegistry();
  const panels = getPanelsForZone(zone);
  
  if (panels.length === 0) {
    return null;
  }

  return (
    <div className={`hud-auto-zone ${className}`} data-zone={zone}>
      {panels.map(panel => {
        const Component = panel.component;
        return (
          <HUDPanelWrapper key={panel.config.id} panelId={panel.config.id}>
            <Component {...(panel.props || {})} />
          </HUDPanelWrapper>
        );
      })}
    </div>
  );
}

// Predefined panel configurations
export const PANEL_CONFIGS = {
  RESOURCE_PANEL: {
    id: 'resource-panel',
    zone: 'sidebar-right' as HUDZone,
    priority: 10,
    persistent: true,
    accessibility: {
      ariaLabel: 'Resource information panel',
      role: 'region'
    }
  },
  TIME_PANEL: {
    id: 'time-panel',
    zone: 'top-right' as HUDZone,
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
  ACTION_PANEL: {
    id: 'action-panel',
    zone: 'middle-right' as HUDZone,
    priority: 8,
    responsive: {
      hideOnMobile: true
    },
    accessibility: {
      ariaLabel: 'Game action buttons',
      role: 'toolbar'
    }
  },
  STATUS_BAR: {
    id: 'status-bar',
    zone: 'bottom-center' as HUDZone,
    priority: 7,
    responsive: {
      hideOnMobile: true
    },
    accessibility: {
      ariaLabel: 'Game status information',
      role: 'status'
    }
  },
  TOP_BAR: {
    id: 'top-bar',
    zone: 'top-center' as HUDZone,
    priority: 11,
    persistent: true,
    accessibility: {
      ariaLabel: 'Game objective and performance',
      role: 'banner'
    }
  }
} as const;
