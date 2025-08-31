import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { getResourceIcon, getResourceColor } from './resourceUtils';

export interface GameResources {
  grain: number;
  coin: number;
  mana: number;
  favor: number;
  unrest: number;
  threat: number;
}

export interface GameTime {
  cycle: number;
  season: string;
  timeRemaining: number; // seconds until next cycle
}

export interface GameHUDProps {
  resources: GameResources;
  time: GameTime;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onAdvanceCycle?: () => void;
  onOpenCouncil?: () => void;
  onOpenEdicts?: () => void;
  onOpenOmens?: () => void;
}

const ResourceIcon: React.FC<{ type: keyof GameResources; value: number; className?: string }> = ({ type, value, className = '' }) => {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className={`flex items-center gap-1 ${className}`}>
            <span className="text-lg">{getResourceIcon(type)}</span>
            <span className={`font-mono text-sm ${getResourceColor(type)}`}>{value}</span>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-gray-900 text-white px-2 py-1 rounded text-xs capitalize"
            sideOffset={5}
          >
            {type}: {value}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

const TimeDisplay: React.FC<{ time: GameTime; isPaused?: boolean }> = ({ time, isPaused }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 bg-neutral-100 rounded-lg px-3 py-2">
      <div className="text-center">
        <div className="text-xs text-neutral-500">Cycle</div>
        <div className="font-bold text-neutral-800">{time.cycle}</div>
      </div>
      <div className="w-px h-8 bg-neutral-300" />
      <div className="text-center">
        <div className="text-xs text-neutral-500">Season</div>
        <div className="font-medium text-neutral-800 capitalize">{time.season}</div>
      </div>
      <div className="w-px h-8 bg-neutral-300" />
      <div className="text-center">
        <div className="text-xs text-neutral-500">Time</div>
        <div className={`font-mono text-sm ${isPaused ? 'text-amber-600' : 'text-emerald-600'}`}>
          {isPaused ? 'PAUSED' : formatTime(time.timeRemaining)}
        </div>
      </div>
    </div>
  );
};

const ActionButton: React.FC<{ 
  onClick?: () => void; 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}> = ({ onClick, children, variant = 'secondary', disabled = false }) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'btn-primary';
      case 'danger':
        return 'btn-danger';
      default:
        return 'btn-secondary';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-3 py-2 text-sm font-medium transition-colors
        ${getVariantClasses()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  );
};

export const GameHUD: React.FC<GameHUDProps> = ({
  resources,
  time,
  isPaused = false,
  onPause,
  onResume,
  onAdvanceCycle,
  onOpenCouncil,
  onOpenEdicts,
  onOpenOmens
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Top HUD Bar */}
      <div className="flex justify-between items-start p-4">
        {/* Resources Panel */}
        <div className="card-elevated bg-white/95 backdrop-blur-sm p-3 pointer-events-auto">
          <div className="grid grid-cols-3 gap-3">
            <ResourceIcon type="grain" value={resources.grain} />
            <ResourceIcon type="coin" value={resources.coin} />
            <ResourceIcon type="mana" value={resources.mana} />
            <ResourceIcon type="favor" value={resources.favor} />
            <ResourceIcon type="unrest" value={resources.unrest} />
            <ResourceIcon type="threat" value={resources.threat} />
          </div>
        </div>

        {/* Time Controls */}
        <div className="card-elevated bg-white/95 backdrop-blur-sm p-3 pointer-events-auto">
          <div className="flex items-center gap-3">
            <TimeDisplay time={time} isPaused={isPaused} />
            <div className="flex gap-2">
              {isPaused ? (
                <ActionButton onClick={onResume} variant="primary">
                  ▶️ Resume
                </ActionButton>
              ) : (
                <ActionButton onClick={onPause}>
                  ⏸️ Pause
                </ActionButton>
              )}
              <ActionButton onClick={onAdvanceCycle} variant="danger">
                ⏭️ Advance
              </ActionButton>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Controls */}
      <div className="absolute top-4 right-4">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <ActionButton onClick={onOpenCouncil}>
            🏛️ Council
          </ActionButton>
          <ActionButton onClick={onOpenEdicts}>
            📜 Edicts
          </ActionButton>
          <ActionButton onClick={onOpenOmens}>
            🔮 Omens
          </ActionButton>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="card-elevated bg-white/90 backdrop-blur-sm p-2 pointer-events-auto">
          <div className="flex justify-between items-center text-sm text-neutral-600">
            <div className="flex items-center gap-4">
              <span>🎯 Click tiles to select • 🖱️ Drag to pan • 🔍 Scroll to zoom</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">FPS:</span>
              <span className="font-mono text-emerald-600">60</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHUD;