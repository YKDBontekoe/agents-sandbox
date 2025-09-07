import React from 'react';
import '../../../styles/design-tokens.css';
import '../../../styles/animations.css';
import type { GameHUDProps, Notification } from './types';
import { useResourceDeltas } from './useResourceDeltas';
import { NotificationCenter } from './NotificationCenter';
import { ResourcePanel } from './ResourcePanel';
import { TimePanel } from './TimePanel';
import { ActionPanel } from './ActionPanel';
import { StatusBar } from './StatusBar';
import { TopBar } from './TopBar';

export const GameHUD: React.FC<GameHUDProps> = (props) => {
  const {
    resources,
    time,
    workforce,
    isPaused = false,
    onPause,
    onResume,
    onAdvanceCycle,
    onOpenCouncil,
    onOpenEdicts,
    onOpenOmens,
    onOpenSettings,
    shortages = {},
    fps = 60,
    quality = 'High',
  } = props;

  const { changes: resourceChanges } = useResourceDeltas(resources, 10);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  const dismissNotification = (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id));

  return (
    <>
      <TopBar objective={undefined} fps={fps} quality={quality} />

      <div className="absolute inset-0 z-50 pointer-events-none animate-fade-in">
        <div className="absolute left-6 top-20 pointer-events-auto">
          <ResourcePanel resources={resources} workforce={workforce} changes={resourceChanges} shortages={shortages} />
        </div>

        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-auto">
          <ActionPanel onOpenCouncil={onOpenCouncil} onOpenEdicts={onOpenEdicts} onOpenOmens={onOpenOmens} onOpenSettings={onOpenSettings} />
        </div>

        <div className="absolute top-20 right-6 pointer-events-auto">
          <TimePanel time={time} isPaused={!!isPaused} onPause={onPause} onResume={onResume} onAdvanceCycle={onAdvanceCycle} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex justify-center pointer-events-auto">
            <StatusBar fps={fps} quality={quality} />
          </div>
        </div>
      </div>

      <NotificationCenter notifications={notifications} onDismiss={dismissNotification} />
    </>
  );
};

export default GameHUD;
