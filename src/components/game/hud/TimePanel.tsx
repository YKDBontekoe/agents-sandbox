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
    <section aria-label="Time Controls" className="bg-gray-800/90 backdrop-blur rounded-md border border-gray-700 p-2 w-72 text-sm select-none text-gray-200">
      <header className="px-2 py-1 text-xs uppercase tracking-wide text-gray-400">Time</header>
      <div className="px-2 py-1 grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-gray-400">Cycle</div>
          <div className="tabular-nums text-gray-100">{time.cycle}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Season</div>
          <div className="text-gray-100">{time.season}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Next in</div>
          <div className="tabular-nums text-gray-100">{Math.max(0, Math.round(time.timeRemaining))}s</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 px-2">
        {isPaused ? (
          <button className="px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs" onClick={onResume}>Resume</button>
        ) : (
          <button className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-white text-xs" onClick={onPause}>Pause</button>
        )}
        <button className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={onAdvanceCycle}>Advance</button>
      </div>
    </section>
  );
}
