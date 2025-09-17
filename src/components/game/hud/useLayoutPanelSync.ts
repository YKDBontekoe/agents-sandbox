import { useEffect } from 'react';
import type { HUDZone, HUDLayoutConfig } from './HUDLayoutSystem';
import type { PanelRegistryStore } from './panelRegistryStore';

export function useLayoutPanelSync(
  store: PanelRegistryStore,
  layout: HUDLayoutConfig,
  getPanelsInZone: (zone: HUDZone) => string[],
  registerPanel: (zone: HUDZone, panelId: string, priority?: number) => boolean,
  unregisterPanel: (zone: HUDZone, panelId: string) => void
) {
  useEffect(() => {
    const syncLayoutWithRegistry = () => {
      const panels = store.getPanels();
      const currentPanels = Array.from(panels.values());

      currentPanels.forEach(panel => {
        const { config, isVisible } = panel;
        const registeredIds = new Set(getPanelsInZone(config.zone));
        const isRegistered = registeredIds.has(config.id);

        if (isVisible && !isRegistered) {
          registerPanel(config.zone, config.id, config.priority);
        } else if (!isVisible && isRegistered) {
          unregisterPanel(config.zone, config.id);
        }
      });

      const panelIds = new Set(panels.keys());
      (Object.keys(layout.zones) as HUDZone[]).forEach(zone => {
        const registeredIds = getPanelsInZone(zone);
        registeredIds.forEach(id => {
          if (!panelIds.has(id)) {
            unregisterPanel(zone, id);
          }
        });
      });
    };

    const unsubscribe = store.subscribe(syncLayoutWithRegistry);
    syncLayoutWithRegistry();
    return unsubscribe;
  }, [store, layout, getPanelsInZone, registerPanel, unregisterPanel]);
}
