import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode
} from 'react';
import { HUDZone, useHUDLayout } from './HUDLayoutSystem';
import {
  createPanelRegistryStore,
  type AnyHUDPanelRegistryEntry,
  type HUDPanelComponent,
  type HUDPanelConfig,
  type HUDPanelUpdate,
  type PanelRegistryStore
} from './panelRegistryStore';
import { useResponsivePanelVisibility } from './useResponsivePanelVisibility';
import { useLayoutPanelSync } from './useLayoutPanelSync';

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

interface HUDPanelRegistryProviderProps {
  children: ReactNode;
}

function usePanelRegistryStore(): PanelRegistryStore {
  return useMemo(() => createPanelRegistryStore(), []);
}

export function HUDPanelRegistryProvider({ children }: HUDPanelRegistryProviderProps) {
  const store = usePanelRegistryStore();
  const {
    screenSize,
    layout,
    registerPanel: registerLayoutPanel,
    unregisterPanel: unregisterLayoutPanel,
    getPanelsInZone
  } = useHUDLayout();

  const panels = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useResponsivePanelVisibility(store, screenSize);
  useLayoutPanelSync(store, layout, getPanelsInZone, registerLayoutPanel, unregisterLayoutPanel);

  const registerPanel = useCallback(<P extends object>(panel: HUDPanelComponent<P>) => {
    store.registerPanel(panel, { screenSize });
  }, [store, screenSize]);

  const unregisterPanel = useCallback((panelId: string) => {
    store.unregisterPanel(panelId);
  }, [store]);

  const updatePanel = useCallback(<P extends object>(panelId: string, updates: HUDPanelUpdate<P>) => {
    store.updatePanel(panelId, updates);
  }, [store]);

  const getPanelsForZone = useCallback((zone: HUDZone) => {
    return store.getPanelsForZone(zone);
  }, [store]);

  const togglePanelVisibility = useCallback((panelId: string) => {
    store.togglePanelVisibility(panelId);
  }, [store]);

  const togglePanelCollapse = useCallback((panelId: string) => {
    store.togglePanelCollapse(panelId);
  }, [store]);

  const getPanelById = useCallback((panelId: string) => {
    return store.getPanelById(panelId);
  }, [store]);

  const contextValue = useMemo<HUDPanelRegistryContextType>(() => ({
    panels,
    registerPanel,
    unregisterPanel,
    updatePanel,
    getPanelsForZone,
    togglePanelVisibility,
    togglePanelCollapse,
    getPanelById
  }), [
    panels,
    registerPanel,
    unregisterPanel,
    updatePanel,
    getPanelsForZone,
    togglePanelVisibility,
    togglePanelCollapse,
    getPanelById
  ]);

  return (
    <HUDPanelRegistryContext.Provider value={contextValue}>
      {children}
    </HUDPanelRegistryContext.Provider>
  );
}

export function useHUDPanel<P extends object>(panel: HUDPanelComponent<P>) {
  const { registerPanel, unregisterPanel } = useHUDPanelRegistry();
  const stablePanel = useStablePanelReference(panel);

  useEffect(() => {
    registerPanel(stablePanel);
    return () => unregisterPanel(stablePanel.config.id);
  }, [stablePanel, registerPanel, unregisterPanel]);
}

function useStablePanelReference<P extends object>(panel: HUDPanelComponent<P>) {
  const panelRef = React.useRef(panel);
  const storedPanel = panelRef.current;

  if (
    storedPanel.config.id !== panel.config.id ||
    storedPanel.config.zone !== panel.config.zone ||
    storedPanel.config.priority !== panel.config.priority ||
    storedPanel.component !== panel.component
  ) {
    panelRef.current = panel;
    return panel;
  }

  if (storedPanel.props !== panel.props) {
    storedPanel.props = panel.props;
  }
  if (storedPanel.isVisible !== panel.isVisible) {
    storedPanel.isVisible = panel.isVisible;
  }
  if (storedPanel.isCollapsed !== panel.isCollapsed) {
    storedPanel.isCollapsed = panel.isCollapsed;
  }

  return storedPanel;
}

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

export type { HUDPanelConfig, HUDPanelComponent, HUDPanelUpdate };
export type { AnyHUDPanelRegistryEntry };
export type { PanelRegistryStore } from './panelRegistryStore';
