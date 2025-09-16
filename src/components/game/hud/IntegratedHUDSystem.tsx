import React from 'react';
import HUDProviders from './providers';
import { PanelComposer, PanelComposerProps } from './PanelComposer';
import { TimeSystem, TIME_SPEEDS, type TimeSpeed } from '@engine';
import { intervalMsToTimeSpeed, sanitizeIntervalMs, timeSpeedToIntervalMs } from '@/app/play/timeSpeedUtils';

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
  const timeSystemRef = React.useRef<TimeSystem | null>(null);
  if (!timeSystemRef.current) {
    timeSystemRef.current = new TimeSystem();
  }
  const timeSystem = timeSystemRef.current;

  React.useEffect(() => {
    timeSystem.start();
    return () => {
      timeSystem.destroy();
    };
  }, [timeSystem]);

  const [isPaused, setIsPaused] = React.useState(false);
  const [intervalMs, setIntervalMs] = React.useState(60000);

  const mockGameData = React.useMemo(() => ({
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
      isPaused,
      intervalMs
    }
  }), [isPaused, intervalMs]);

  const handleGameAction = React.useCallback((action: string, data?: unknown) => {
    switch (action) {
      case 'pause': {
        timeSystem.setSpeed(TIME_SPEEDS.PAUSED);
        setIsPaused(true);
        break;
      }
      case 'resume': {
        const resumeSpeed = intervalMsToTimeSpeed(intervalMs);
        timeSystem.setSpeed(resumeSpeed);
        setIsPaused(false);
        break;
      }
      case 'set-speed': {
        const raw = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
        const speed = raw && typeof raw.speed === 'number' ? (raw.speed as TimeSpeed) : null;
        const requestedMs = raw && 'intervalMs' in raw
          ? (raw.intervalMs as unknown)
          : raw && 'ms' in raw
            ? (raw.ms as unknown)
            : null;

        let nextMs = sanitizeIntervalMs(requestedMs);
        if (speed != null && nextMs == null) {
          nextMs = timeSpeedToIntervalMs(speed);
        }

        if (nextMs == null) {
          return;
        }

        const nextSpeed = speed ?? intervalMsToTimeSpeed(nextMs);
        timeSystem.setSpeed(nextSpeed);
        setIntervalMs(nextMs);
        setIsPaused(nextSpeed === TIME_SPEEDS.PAUSED);
        break;
      }
      default: {
        console.log('Game action:', action, data);
      }
    }
  }, [intervalMs, timeSystem]);

  return (
    <IntegratedHUDSystem
      defaultPreset="default"
      gameData={mockGameData}
      onGameAction={handleGameAction}
      className="w-full h-screen"
      timeSystem={timeSystem}
    />
  );
}
