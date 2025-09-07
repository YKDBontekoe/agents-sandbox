import React from 'react';
import HUDProviders from './providers';
import { PanelComposer, PanelComposerProps } from './PanelComposer';

export interface IntegratedHUDSystemProps extends PanelComposerProps {
  defaultPreset?: string;
}

export function IntegratedHUDSystem({
  defaultPreset = 'default',
  ...rest
}: IntegratedHUDSystemProps) {
  return (
    <HUDProviders defaultPreset={defaultPreset}>
      <PanelComposer {...rest} />
    </HUDProviders>
  );
}

export default IntegratedHUDSystem;
