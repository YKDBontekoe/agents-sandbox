import React, { useEffect, useMemo, useRef, useState } from 'react';
import HUDProviders from './providers';
import { PanelComposer, PanelComposerProps } from './PanelComposer';
import { TimeSystem, TIME_SPEEDS, type TimeSpeed } from '@engine';

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
  const timeSystemRef = useRef<TimeSystem | null>(null);
  if (!timeSystemRef.current) {
    timeSystemRef.current = new TimeSystem();
    timeSystemRef.current.start();
  }
  const timeSystem = timeSystemRef.current;

  const [mockGameData, setMockGameData] = useState(() => ({
    resources: {
      grain: 100,
      coin: 50,
      mana: 25,
      favor: 10,
      wood: 75,
      planks: 30,
      unrest: 5,
      threat: 2,
    },
    resourceChanges: {
      grain: 2,
      coin: 1,
      mana: 0,
      favor: 0,
      wood: 1,
      planks: 0,
      unrest: 0,
      threat: 0,
    },
    workforce: {
      total: 100,
      idle: 20,
      needed: 10,
    },
    time: {
      cycle: 1,
      season: 'Spring',
      timeRemaining: 30,
      isPaused: false,
      intervalMs: 60000,
    },
  }));

  const lastActiveSpeedRef = useRef<TimeSpeed>(
    timeSystem?.isPaused() ? TIME_SPEEDS.NORMAL : timeSystem?.getCurrentSpeed() ?? TIME_SPEEDS.NORMAL,
  );

  const speedValues = useMemo(() => new Set<number>(Object.values(TIME_SPEEDS)), []);

  useEffect(() => {
    return () => {
      timeSystemRef.current?.destroy();
    };
  }, []);

  const setTimeState = (updates: Partial<typeof mockGameData.time>) => {
    setMockGameData(prev => ({
      ...prev,
      time: {
        ...prev.time,
        ...updates,
      },
    }));
  };

  const getIntervalForSpeed = (speed: TimeSpeed): number => {
    switch (speed) {
      case TIME_SPEEDS.FAST:
        return 6000;
      case TIME_SPEEDS.VERY_FAST:
        return 3000;
      case TIME_SPEEDS.ULTRA_FAST:
        return 1500;
      case TIME_SPEEDS.HYPER_SPEED:
        return 600;
      default:
        return 12000;
    }
  };

  const parseSpeed = (value: unknown): TimeSpeed | null => {
    if (typeof value === 'number' && speedValues.has(value)) {
      return value as TimeSpeed;
    }
    if (typeof value === 'string') {
      const numeric = Number(value);
      if (!Number.isNaN(numeric) && speedValues.has(numeric)) {
        return numeric as TimeSpeed;
      }
    }
    return null;
  };

  const handleGameAction = (action: string, data?: unknown) => {
    if (!timeSystem) {
      return;
    }

    const ensureActiveSpeed = () => {
      const current = timeSystem.getCurrentSpeed();
      if (current !== TIME_SPEEDS.PAUSED) {
        lastActiveSpeedRef.current = current;
      }
    };

    if (action === 'pause') {
      ensureActiveSpeed();
      timeSystem.setSpeed(TIME_SPEEDS.PAUSED);
      setTimeState({ isPaused: true });
      return;
    }

    if (action === 'resume') {
      const resumeSpeed = lastActiveSpeedRef.current ?? TIME_SPEEDS.NORMAL;
      timeSystem.setSpeed(resumeSpeed);
      setTimeState({ isPaused: false, intervalMs: getIntervalForSpeed(resumeSpeed) });
      return;
    }

    if (action === 'set-speed') {
      const requested = parseSpeed((data as { speed?: unknown } | undefined)?.speed);
      if (requested == null) {
        return;
      }
      if (requested === TIME_SPEEDS.PAUSED) {
        ensureActiveSpeed();
        timeSystem.setSpeed(TIME_SPEEDS.PAUSED);
        setTimeState({ isPaused: true });
        return;
      }
      lastActiveSpeedRef.current = requested;
      timeSystem.setSpeed(requested);
      setTimeState({ isPaused: false, intervalMs: getIntervalForSpeed(requested) });
      return;
    }

    console.log('Game action:', action, data);
  };

  if (!timeSystem) {
    return null;
  }

  return (
    <IntegratedHUDSystem
      defaultPreset="default"
      timeSystem={timeSystem}
      gameData={mockGameData}
      onGameAction={handleGameAction}
      className="w-full h-screen"
    />
  );
}
