import React, { ReactNode } from 'react';
import { HUDAccessibilityProvider } from './HUDAccessibility';
import { HUDLayoutPresetProvider, useHUDLayoutPresets } from './HUDLayoutPresets';
import { HUDLayoutProvider } from './HUDLayoutSystem';
import { HUDPanelRegistryProvider } from './HUDPanelRegistry';
import { LayoutPreset } from '@/lib/preferences';
import './hud-accessibility.css';

interface HUDProvidersProps {
  children: ReactNode;
  defaultPreset?: string;
}

function LayoutWithPreset({ children }: { children: ReactNode }) {
  const { currentPreset } = useHUDLayoutPresets();
  return (
    <HUDLayoutProvider
      layoutPreset={currentPreset.id as LayoutPreset}
      customLayout={currentPreset.layout}
    >
      {children}
    </HUDLayoutProvider>
  );
}

export function HUDProviders({ children, defaultPreset = 'default' }: HUDProvidersProps) {
  return (
    <HUDAccessibilityProvider>
      <HUDLayoutPresetProvider defaultPreset={defaultPreset}>
        <LayoutWithPreset>
          <HUDPanelRegistryProvider>{children}</HUDPanelRegistryProvider>
        </LayoutWithPreset>
      </HUDLayoutPresetProvider>
    </HUDAccessibilityProvider>
  );
}

export default HUDProviders;
