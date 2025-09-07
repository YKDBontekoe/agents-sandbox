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

// Example component for demo purposes
export function HUDSystemExample() {
  const mockGameData = {
    resources: {
      grain: 100,
      coin: 50,
      mana: 25,
      favor: 10,
      wood: 75,
      planks: 30,
      unrest: 5,
      threat: 2
    },
    resourceChanges: {
      grain: 2,
      coin: 1,
      mana: 0,
      favor: 0,
      wood: 1,
      planks: 0,
      unrest: 0,
      threat: 0
    },
    workforce: {
      total: 100,
      idle: 20,
      needed: 10
    },
    time: {
      cycle: 1,
      season: 'Spring',
      timeRemaining: 30,
      isPaused: false
    }
  };

  const handleGameAction = (action: string, data?: unknown) => {
    console.log('Game action:', action, data);
  };

  return (
    <IntegratedHUDSystem
      defaultPreset="default"
      gameData={mockGameData}
      onGameAction={handleGameAction}
      className="w-full h-screen"
    />
  );
}
