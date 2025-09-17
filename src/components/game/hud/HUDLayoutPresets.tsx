import React, { createContext, useContext, type ReactNode } from 'react';
import { useHudPresetManager, type HudPresetManagerOptions, type HudPresetManager } from './hooks/useHudPresetManager';
import { defaultHudPresets } from './presets/defaultPresets';
import type { HUDLayoutPresetId } from './presets/types';

export type HUDLayoutPresetContextValue = HudPresetManager;

interface HUDLayoutPresetProviderProps {
  children: ReactNode;
  defaultPreset?: HUDLayoutPresetId;
  storage?: HudPresetManagerOptions['storage'];
  storageKeys?: HudPresetManagerOptions['storageKeys'];
}

const HUDLayoutPresetContext = createContext<HUDLayoutPresetContextValue | null>(null);

export function HUDLayoutPresetProvider({
  children,
  defaultPreset = 'default',
  storage,
  storageKeys,
}: HUDLayoutPresetProviderProps) {
  const manager = useHudPresetManager({
    basePresets: defaultHudPresets,
    defaultPresetId: defaultPreset,
    storage,
    storageKeys,
  });

  return (
    <HUDLayoutPresetContext.Provider value={manager}>
      {children}
    </HUDLayoutPresetContext.Provider>
  );
}

export function useHUDLayoutPresets(): HUDLayoutPresetContextValue {
  const context = useContext(HUDLayoutPresetContext);
  if (!context) {
    throw new Error('useHUDLayoutPresets must be used within a HUDLayoutPresetProvider');
  }
  return context;
}

export { defaultHudPresets } from './presets/defaultPresets';
export type { HUDLayoutPreset, HUDLayoutPresetIconData, HUDLayoutPresetId } from './presets/types';
export type { HudPresetManager } from './hooks/useHudPresetManager';

export default HUDLayoutPresetProvider;
