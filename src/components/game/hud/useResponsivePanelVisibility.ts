import { useEffect } from 'react';
import type { ScreenSize } from './HUDLayoutSystem';
import type { PanelRegistryStore } from './panelRegistryStore';

export function useResponsivePanelVisibility(store: PanelRegistryStore, screenSize: ScreenSize) {
  useEffect(() => {
    const applyResponsiveState = () => {
      store.reconcileResponsiveState(screenSize);
    };

    applyResponsiveState();
    return store.subscribe(applyResponsiveState);
  }, [store, screenSize]);
}
