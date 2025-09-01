import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faPause,
  faForward,
  faLandmark,
  faScroll,
  faEye,
  faMousePointer,
  faArrowsAlt,
  faMagnifyingGlass
} from '@/lib/icons';
import { ActionButton, ResourceIcon } from '../ui';
import '../../styles/design-tokens.css';
import '../../styles/animations.css';
import { GameResources, GameTime } from '@/types/game';

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
  highlightAdvance?: boolean;
}

// Using imported ResourceIcon component from '../ui'

const TimeDisplay: React.FC<{ time: GameTime; isPaused?: boolean }> = ({ time, isPaused }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="flex items-center bg-panel px-2 sm:px-3 lg:px-4 py-2 sm:py-3 border border-border animate-scale-in transition-smooth hover-lift"
      style={{
        gap: 'var(--spacing-xs)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        animationDelay: '0.2s'
      }}
    >
      <div className="text-center min-w-[2rem] sm:min-w-[2.5rem] lg:min-w-[3rem]">
        <div className="font-medium text-muted uppercase tracking-wide mb-1 hidden md:block" style={{ fontSize: 'var(--font-size-xs)' }}>Cycle</div>
        <div className="text-sm sm:text-base lg:text-lg font-bold text-foreground">{time.cycle}</div>
      </div>
      <div className="w-px h-6 sm:h-8 lg:h-10 bg-gradient-to-b from-transparent via-border to-transparent" />
      <div className="text-center min-w-[2.5rem] sm:min-w-[3rem] lg:min-w-[4rem]">
        <div className="font-medium text-muted uppercase tracking-wide mb-1 hidden md:block" style={{ fontSize: 'var(--font-size-xs)' }}>Season</div>
        <div className="text-xs sm:text-sm font-semibold text-foreground capitalize">{time.season}</div>
      </div>
      <div className="w-px h-6 sm:h-8 lg:h-10 bg-gradient-to-b from-transparent via-border to-transparent" />
      <div className="text-center min-w-[2.5rem] sm:min-w-[3rem] lg:min-w-[4rem]">
        <div className="font-medium text-muted uppercase tracking-wide mb-1 hidden md:block" style={{ fontSize: 'var(--font-size-xs)' }}>Time</div>
        <div
          className={`font-mono text-xs sm:text-sm font-semibold transition-colors duration-200 ${
            isPaused ? 'text-warning animate-pulse animate-pulse-slow animate-bounce-gentle' : 'text-success'
          }`}
        >
          {isPaused ? (
            <>
              <span className="hidden sm:inline">PAUSED</span>
              <span className="sm:hidden">⏸</span>
            </>
          ) : formatTime(time.timeRemaining)}
        </div>
      </div>
    </div>
  );
};

// Using imported ActionButton component from '../ui'

export const GameHUD: React.FC<GameHUDProps> = ({
  resources,
  time,
  isPaused = false,
  onPause,
  onResume,
  onAdvanceCycle,
  onOpenCouncil,
  onOpenEdicts,
  onOpenOmens,
  highlightAdvance = false
}) => {
  const prevResources = useRef<GameResources>(resources);
  const [resourceChanges, setResourceChanges] = useState<Record<keyof GameResources, number | null>>({
    grain: null,
    coin: null,
    mana: null,
    favor: null,
    unrest: null,
    threat: null
  });

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    (Object.keys(resources) as (keyof GameResources)[]).forEach((key) => {
      const prev = prevResources.current[key];
      const curr = resources[key];
      if (prev !== curr) {
        const delta = curr - prev;
        setResourceChanges((changes) => ({ ...changes, [key]: delta }));
        const timer = setTimeout(() => {
          setResourceChanges((changes) => ({ ...changes, [key]: null }));
        }, 1000);
        timers.push(timer);
      }
    });
    prevResources.current = { ...resources };
    return () => timers.forEach((t) => clearTimeout(t));
  }, [resources]);

  return (
    <div className="absolute inset-0 z-50 pointer-events-none animate-fade-in flex flex-col">
      {/* Top HUD Bar - Mobile optimized */}
      <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-start p-2 sm:p-3 lg:p-4 gap-2 sm:gap-3">
        {/* Resources Panel */}
        <div
          className="bg-panel backdrop-blur-md border border-border p-2 sm:p-3 lg:p-4 pointer-events-auto transition-all duration-200 hover:shadow-xl w-full xl:w-auto animate-slide-in-left"
          style={{
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div className="mb-1 sm:mb-2 hidden md:block" style={{ marginBottom: 'var(--spacing-sm)' }}>
            <h3
              className="font-semibold text-foreground uppercase tracking-wide"
              style={{ fontSize: 'var(--font-size-xs)' }}
            >
              Resources
            </h3>
          </div>
          <div 
            className="grid grid-cols-6 sm:grid-cols-6 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-3"
            style={{ gap: 'var(--spacing-xs)' }}
          >
            <ResourceIcon type="grain" value={resources.grain} delta={resourceChanges.grain} className="animate-scale-in stagger-1" />
            <ResourceIcon type="coin" value={resources.coin} delta={resourceChanges.coin} className="animate-scale-in stagger-2" />
            <ResourceIcon type="mana" value={resources.mana} delta={resourceChanges.mana} className="animate-scale-in stagger-3" />
            <ResourceIcon type="favor" value={resources.favor} delta={resourceChanges.favor} className="animate-scale-in stagger-4" />
            <ResourceIcon type="unrest" value={resources.unrest} delta={resourceChanges.unrest} className="animate-scale-in stagger-5" />
            <ResourceIcon type="threat" value={resources.threat} delta={resourceChanges.threat} className="animate-scale-in stagger-6" />
          </div>
        </div>

        {/* Time Controls */}
        <div
          className="bg-panel backdrop-blur-md border border-border p-2 sm:p-3 lg:p-4 pointer-events-auto transition-all duration-200 hover:shadow-xl w-full xl:w-auto animate-slide-in-right"
          style={{
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div 
            className="flex flex-col sm:flex-row items-center"
            style={{ gap: 'var(--spacing-sm)' }}
          >
            <TimeDisplay time={time} isPaused={isPaused} />
            <div 
              className="flex w-full sm:w-auto"
              style={{ gap: 'var(--spacing-xs)' }}
            >
              {isPaused ? (
                <ActionButton onClick={onResume} variant="primary" className="flex-1 sm:flex-none transition-smooth hover-lift text-xs sm:text-sm">
                  <FontAwesomeIcon icon={faPlay} className="mr-1 sm:mr-2" /> 
                  <span className="hidden sm:inline">Resume</span>
                </ActionButton>
              ) : (
                <ActionButton onClick={onPause} className="flex-1 sm:flex-none transition-smooth hover-lift text-xs sm:text-sm">
                  <FontAwesomeIcon icon={faPause} className="mr-1 sm:mr-2" /> 
                  <span className="hidden sm:inline">Pause</span>
                </ActionButton>
              )}
              <ActionButton onClick={onAdvanceCycle} variant="danger" className={`flex-1 sm:flex-none transition-smooth hover-lift text-xs sm:text-sm ${highlightAdvance ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}>
                <FontAwesomeIcon icon={faForward} className="mr-1 sm:mr-2" /> 
                <span className="hidden sm:inline">Advance</span>
              </ActionButton>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Controls - Mobile responsive positioning */}
      <div className="flex-1 flex flex-col justify-center">
      <div
        className="self-end mr-2 sm:mr-3 lg:mr-4 z-40 animate-slide-in-right"
      >
          <div
            className="bg-panel backdrop-blur-md border border-border p-2 sm:p-3 pointer-events-auto transition-all duration-200 hover:shadow-xl hover-lift"
            style={{
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div 
              className="flex flex-row xl:flex-col"
              style={{ gap: 'var(--spacing-xs)' }}
            >
              <ActionButton 
                 onClick={onOpenCouncil} 
                 variant="secondary" 
                 className="w-full justify-center xl:justify-start text-xs sm:text-sm transition-smooth hover-lift animate-scale-in stagger-1 px-2 sm:px-3"
               >
                 <FontAwesomeIcon icon={faLandmark} className="xl:mr-2" /> 
                 <span className="hidden sm:inline xl:inline ml-1 xl:ml-0">Council</span>
               </ActionButton>
               <ActionButton 
                 onClick={onOpenEdicts} 
                 variant="secondary" 
                 className="w-full justify-center xl:justify-start text-xs sm:text-sm transition-smooth hover-lift animate-scale-in stagger-2 px-2 sm:px-3"
               >
                 <FontAwesomeIcon icon={faScroll} className="xl:mr-2" /> 
                 <span className="hidden sm:inline xl:inline ml-1 xl:ml-0">Edicts</span>
               </ActionButton>
               <ActionButton 
                 onClick={onOpenOmens} 
                 variant="secondary" 
                 className="w-full justify-center xl:justify-start text-xs sm:text-sm transition-smooth hover-lift animate-scale-in stagger-3 px-2 sm:px-3"
               >
                 <FontAwesomeIcon icon={faEye} className="xl:mr-2" /> 
                 <span className="hidden sm:inline xl:inline ml-1 xl:ml-0">Omens</span>
               </ActionButton>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar - Mobile optimized */}
      <div 
        className="mt-auto pointer-events-auto bg-panel backdrop-blur-md border border-border mx-2 sm:mx-3 lg:mx-4 mb-2 sm:mb-3 lg:mb-4 px-2 sm:px-3 lg:px-4 py-2 sm:py-3 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 animate-fade-in transition-smooth hover-lift"
        style={{
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          fontSize: 'var(--font-size-sm)',
          animationDelay: '0.3s'
        }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-2 sm:gap-4">
          <div className="flex flex-row sm:flex-row items-center gap-3 sm:gap-4 flex-wrap justify-center sm:justify-start">
            <div className="flex items-center text-muted text-xs">
              <FontAwesomeIcon icon={faMousePointer} className="text-muted mr-1" />
              <span className="hidden sm:inline">Click tiles to select</span>
              <span className="sm:hidden">Click</span>
            </div>
            <div className="flex items-center text-muted text-xs">
              <FontAwesomeIcon icon={faArrowsAlt} className="text-muted mr-1" />
              <span className="hidden sm:inline">Drag to pan</span>
              <span className="sm:hidden">Drag</span>
            </div>
            <div className="flex items-center text-muted text-xs">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="text-muted mr-1" />
              <span className="hidden sm:inline">Scroll to zoom</span>
              <span className="sm:hidden">Zoom</span>
            </div>
          </div>
          <div className="flex items-center">
            <div
              className="flex items-center px-2 sm:px-3 py-1 bg-success border border-success rounded-md"
            >
              <span className="font-medium text-success text-xs mr-1">
                FPS:
              </span>
              <span className="font-mono font-bold text-success text-xs">
                60
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
