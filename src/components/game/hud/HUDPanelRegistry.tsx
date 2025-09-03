import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
export interface HUDPanelComponent {
  config: HUDPanelConfig;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  isVisible?: boolean;
  isCollapsed?: boolean;
}

// Panel registry context
interface HUDPanelRegistryContextType {
  panels: Map<string, HUDPanelComponent>;
  registerPanel: (panel: HUDPanelComponent) => void;
  unregisterPanel: (panelId: string) => void;
  updatePanel: (panelId: string, updates: Partial<HUDPanelComponent>) => void;
  getPanelsForZone: (zone: HUDZone) => HUDPanelComponent[];
  togglePanelVisibility: (panelId: string) => void;
  togglePanelCollapse: (panelId: string) => void;
  getPanelById: (panelId: string) => HUDPanelComponent | undefined;
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
  const [panels, setPanels] = useState<Map<string, HUDPanelComponent>>(new Map());
  const { screenSize, layout, activeZones, registerPanel: registerLayoutPanel, unregisterPanel: unregisterLayoutPanel, getPanelsInZone } = useHUDLayout();

  const registerPanel = useCallback((panel: HUDPanelComponent) => {
    const { config } = panel;
    
    // Check responsive visibility
    const shouldHide = 
      (screenSize === 'mobile' && config.responsive?.hideOnMobile) ||
      (screenSize === 'tablet' && config.responsive?.hideOnTablet);
    
    const shouldCollapse = 
      screenSize === 'mobile' && config.responsive?.collapseOnMobile;

    const panelWithState: HUDPanelComponent = {
      ...panel,
      isVisible: !shouldHide,
      isCollapsed: shouldCollapse
    };

    setPanels(prev => {
      const newPanels = new Map(prev);
      newPanels.set(config.id, panelWithState);
      return newPanels;
    });

    // Do not register with HUDLayout here; defer to reconcile effect after render
  }, [screenSize, registerLayoutPanel]);

  const unregisterPanel = useCallback((panelId: string) => {
    // Only update local registry; layout reconciliation effect will handle unregistering
    setPanels(prev => {
      if (!prev.has(panelId)) return prev;
      const newPanels = new Map(prev);
      newPanels.delete(panelId);
      return newPanels;
    });
  }, []);

  const updatePanel = useCallback((panelId: string, updates: Partial<HUDPanelComponent>) => {
    setPanels(prev => {
      const panel = prev.get(panelId);
      if (!panel) return prev;

      const newPanels = new Map(prev);
      newPanels.set(panelId, { ...panel, ...updates });
      return newPanels;
    });
  }, []);

  const getPanelsForZone = useCallback((zone: HUDZone): HUDPanelComponent[] => {
    return Array.from(panels.values())
      .filter(panel => panel.config.zone === zone && panel.isVisible)
      .sort((a, b) => (b.config.priority || 0) - (a.config.priority || 0));
  }, [panels]);

  const togglePanelVisibility = useCallback((panelId: string) => {
    const panel = panels.get(panelId);
    if (panel) {
      const newVisibility = !panel.isVisible;
      // Update local state; layout reconciliation effect will sync registration
      updatePanel(panelId, { isVisible: newVisibility });
    }
  }, [panels, updatePanel]);

  const togglePanelCollapse = useCallback((panelId: string) => {
    const panel = panels.get(panelId);
    if (panel) {
      updatePanel(panelId, { isCollapsed: !panel.isCollapsed });
    }
  }, [panels, updatePanel]);

  const getPanelById = useCallback((panelId: string): HUDPanelComponent | undefined => {
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

      const shouldCollapse = screenSize === 'mobile' && config.responsive?.collapseOnMobile;

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
  }, [screenSize]);

  // Reconcile layout registration after render to match local panel registry exactly
  useEffect(() => {
    // Build desired registrations by zone
    const desiredByZone = new Map<HUDZone, Set<string>>();
    Array.from(panels.values()).forEach(panel => {
      const { config, isVisible } = panel;
      const zoneCfg = layout.zones[config.zone];
      const zoneActive = zoneCfg?.enabled && activeZones.includes(config.zone);
      if (isVisible && zoneActive) {
        if (!desiredByZone.has(config.zone)) desiredByZone.set(config.zone, new Set());
        desiredByZone.get(config.zone)!.add(config.id);
      }
    });

    // For every known zone, diff current layout registration vs desired
    (Object.keys(layout.zones) as HUDZone[]).forEach(zone => {
      const registered = new Set(getPanelsInZone(zone));
      const desired = desiredByZone.get(zone) || new Set<string>();

      // Unregister any panels no longer desired
      registered.forEach(id => {
        if (!desired.has(id)) {
          unregisterLayoutPanel(zone, id);
        }
      });
      // Register any desired panels not yet registered
      desired.forEach(id => {
        if (!registered.has(id)) {
          const panel = panels.get(id);
          const priority = panel?.config.priority;
          registerLayoutPanel(zone, id, priority);
        }
      });
    });
  }, [panels, layout.zones, activeZones, getPanelsInZone, registerLayoutPanel, unregisterLayoutPanel]);

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
export function useHUDPanel(panel: HUDPanelComponent) {
  const { registerPanel, unregisterPanel } = useHUDPanelRegistry();

  useEffect(() => {
    registerPanel(panel);
    return () => unregisterPanel(panel.config.id);
  }, [panel.config.id, registerPanel, unregisterPanel]);
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
