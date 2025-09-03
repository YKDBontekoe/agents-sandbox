import React from 'react';

interface Props {
  objective?: string;
  fps?: number;
  quality?: string;
}

export function TopBar({ objective, fps, quality }: Props) {
  return (
    <div className="fixed top-0 inset-x-0 z-40 px-4 py-2 bg-indigo-700 text-white text-sm shadow">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        <div className="font-medium truncate">{objective ?? 'Hold the Dominion—keep Unrest < 80 and Threat < 70.'}</div>
        <div className="flex items-center gap-4 text-indigo-100">
          {typeof fps === 'number' && <span className="tabular-nums">{Math.round(fps)} fps</span>}
          {quality && <span>{quality}</span>}
        </div>
      </div>
    </div>
  );
}