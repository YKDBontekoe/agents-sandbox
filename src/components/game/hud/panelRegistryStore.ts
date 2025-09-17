import type { ComponentType } from 'react';
import { HUDZone, ScreenSize } from './HUDLayoutSystem';

export interface HUDPanelConfig {
  id: string;
  zone: HUDZone;
  priority?: number;
  persistent?: boolean;
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

export interface HUDPanelComponent<P extends object = Record<string, never>> {
  config: HUDPanelConfig;
  component: ComponentType<P>;
  props?: Partial<P>;
  isVisible?: boolean;
  isCollapsed?: boolean;
}

type HUDPanelRegistryEntry<P extends object = Record<string, never>> = HUDPanelComponent<P> & {
  isVisible: boolean;
  isCollapsed: boolean;
};

export type AnyHUDPanelRegistryEntry = HUDPanelRegistryEntry<object>;

export type HUDPanelUpdate<P extends object = Record<string, never>> = Partial<
  Pick<HUDPanelRegistryEntry<P>, 'props' | 'isVisible' | 'isCollapsed'>
>;

export interface PanelRegistryStore {
  getPanels(): Map<string, AnyHUDPanelRegistryEntry>;
  getSnapshot(): Map<string, AnyHUDPanelRegistryEntry>;
  subscribe(listener: (panels: Map<string, AnyHUDPanelRegistryEntry>) => void): () => void;
  registerPanel<P extends object>(panel: HUDPanelComponent<P>, options: { screenSize: ScreenSize }): void;
  unregisterPanel(panelId: string): void;
  updatePanel<P extends object>(panelId: string, updates: HUDPanelUpdate<P>): void;
  togglePanelVisibility(panelId: string): void;
  togglePanelCollapse(panelId: string): void;
  getPanelsForZone(zone: HUDZone): AnyHUDPanelRegistryEntry[];
  getPanelById(panelId: string): AnyHUDPanelRegistryEntry | undefined;
  reconcileResponsiveState(screenSize: ScreenSize): void;
}

type Listener = (panels: Map<string, AnyHUDPanelRegistryEntry>) => void;

type ResponsiveState = {
  isVisible: boolean;
  isCollapsed: boolean;
};

function deriveResponsiveState(config: HUDPanelConfig, screenSize: ScreenSize): ResponsiveState {
  const shouldHide =
    (screenSize === 'mobile' && config.responsive?.hideOnMobile) ||
    (screenSize === 'tablet' && config.responsive?.hideOnTablet);

  const shouldCollapse = Boolean(screenSize === 'mobile' && config.responsive?.collapseOnMobile);

  return {
    isVisible: !shouldHide,
    isCollapsed: shouldCollapse
  };
}

function sortPanelsByPriority(panels: Iterable<AnyHUDPanelRegistryEntry>): AnyHUDPanelRegistryEntry[] {
  return Array.from(panels).sort((a, b) => (b.config.priority || 0) - (a.config.priority || 0));
}

export function createPanelRegistryStore(
  initialPanels: Iterable<[string, AnyHUDPanelRegistryEntry]> = []
): PanelRegistryStore {
  let panels = new Map<string, AnyHUDPanelRegistryEntry>(initialPanels);
  const listeners = new Set<Listener>();

  const notify = () => {
    listeners.forEach(listener => listener(panels));
  };

  const setPanels = (nextPanels: Map<string, AnyHUDPanelRegistryEntry>) => {
    if (panels === nextPanels) return;
    panels = nextPanels;
    notify();
  };

  const updatePanelEntry = (
    panelId: string,
    updater: (entry: AnyHUDPanelRegistryEntry) => AnyHUDPanelRegistryEntry
  ) => {
    const existing = panels.get(panelId);
    if (!existing) return;

    const nextEntry = updater(existing);
    if (nextEntry === existing) {
      return;
    }

    const nextPanels = new Map(panels);
    nextPanels.set(panelId, nextEntry);
    setPanels(nextPanels);
  };

  const registerPanel = <P extends object>(
    panel: HUDPanelComponent<P>,
    { screenSize }: { screenSize: ScreenSize }
  ) => {
    const responsiveState = deriveResponsiveState(panel.config, screenSize);
    const entry: HUDPanelRegistryEntry<P> = {
      ...panel,
      isVisible: panel.isVisible ?? responsiveState.isVisible,
      isCollapsed: panel.isCollapsed ?? responsiveState.isCollapsed
    };

    const nextPanels = new Map(panels);
    nextPanels.set(panel.config.id, entry as AnyHUDPanelRegistryEntry);
    setPanels(nextPanels);
  };

  const unregisterPanel = (panelId: string) => {
    if (!panels.has(panelId)) return;
    const nextPanels = new Map(panels);
    nextPanels.delete(panelId);
    setPanels(nextPanels);
  };

  const updatePanel = <P extends object>(panelId: string, updates: HUDPanelUpdate<P>) => {
    updatePanelEntry(panelId, panel => ({
      ...panel,
      ...updates
    }));
  };

  const togglePanelVisibility = (panelId: string) => {
    updatePanelEntry(panelId, panel => ({
      ...panel,
      isVisible: !panel.isVisible
    }));
  };

  const togglePanelCollapse = (panelId: string) => {
    updatePanelEntry(panelId, panel => ({
      ...panel,
      isCollapsed: !panel.isCollapsed
    }));
  };

  const getPanelsForZone = (zone: HUDZone) => {
    const zonePanels = Array.from(panels.values()).filter(
      panel => panel.config.zone === zone && panel.isVisible
    );
    return sortPanelsByPriority(zonePanels);
  };

  const getPanelById = (panelId: string) => panels.get(panelId);

  const reconcileResponsiveState = (screenSize: ScreenSize) => {
    let changed = false;
    const nextPanels = new Map(panels);

    panels.forEach((panel, panelId) => {
      const responsiveState = deriveResponsiveState(panel.config, screenSize);
      if (
        panel.isVisible !== responsiveState.isVisible ||
        panel.isCollapsed !== responsiveState.isCollapsed
      ) {
        nextPanels.set(panelId, {
          ...panel,
          isVisible: responsiveState.isVisible,
          isCollapsed: responsiveState.isCollapsed
        });
        changed = true;
      }
    });

    if (changed) {
      setPanels(nextPanels);
    }
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    getPanels: () => panels,
    getSnapshot: () => panels,
    subscribe,
    registerPanel,
    unregisterPanel,
    updatePanel,
    togglePanelVisibility,
    togglePanelCollapse,
    getPanelsForZone,
    getPanelById,
    reconcileResponsiveState
  };
}

export type { HUDPanelRegistryEntry };
