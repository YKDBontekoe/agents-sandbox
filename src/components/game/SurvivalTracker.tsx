'use client';

import { useBestCycle } from '@/hooks/useBestCycle';

interface SurvivalTrackerProps {
  cycle: number;
  unrest: number;
  threat: number;
}

export default function SurvivalTracker({ cycle, unrest, threat }: SurvivalTrackerProps) {
  const bestCycle = useBestCycle(cycle);

  const bar = (label: string, value: number) => {
    const pct = Math.max(0, Math.min(100, value));
    const level = value >= 90 ? 'danger' : value >= 70 ? 'warn' : 'safe';
    const base = 'h-2 rounded transition-all duration-300';
    const color =
      level === 'danger'
        ? 'bg-red-600 animate-pulse'
        : level === 'warn'
        ? 'bg-amber-500 animate-pulse'
        : 'bg-emerald-500';
    return (
      <div key={label}>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{label}</span>
          <span>{pct}</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded">
          <div className={`${base} ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-4 text-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-100 font-semibold">Survival</h3>
        <div className="text-sm text-gray-200 font-medium">Cycle {cycle}</div>
      </div>
      <div className="text-xs text-gray-400 mb-3">Best: {bestCycle}</div>
      <div className="space-y-3">
        {bar('Unrest', unrest)}
        {bar('Threat', threat)}
      </div>
    </div>
  );
}
