import React from 'react';
import type { GameTime } from './types';

interface Props {
  time: GameTime;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onAdvanceCycle?: () => void;
}

export function TimePanel({ time, isPaused, onPause, onResume, onAdvanceCycle }: Props) {
  return (
    <section aria-label="Time Controls" className="bg-white/80 backdrop-blur rounded-md border border-slate-200 p-2 w-72 text-sm select-none">
      <header className="px-2 py-1 text-xs uppercase tracking-wide text-slate-500">Time</header>
      <div className="px-2 py-1 grid grid-cols-2 gap-2 text-slate-800">
        <div>
          <div className="text-xs text-slate-500">Cycle</div>
          <div className="tabular-nums">{time.cycle}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Season</div>
          <div>{time.season}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Next in</div>
          <div className="tabular-nums">{Math.max(0, Math.round(time.timeRemaining))}s</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 px-2">
        {isPaused ? (
          <button className="px-2 py-1 rounded bg-green-600 text-white text-xs" onClick={onResume}>Resume</button>
        ) : (
          <button className="px-2 py-1 rounded bg-yellow-600 text-white text-xs" onClick={onPause}>Pause</button>
        )}
        <button className="px-2 py-1 rounded bg-blue-600 text-white text-xs" onClick={onAdvanceCycle}>Advance</button>
      </div>
    </section>
  );
}