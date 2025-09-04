import React from 'react';

interface QuestTrackerProps {
  completed: Record<string, boolean>;
}

const QUESTS: Array<{ id: string; text: string }> = [
  { id: 'farm', text: 'Build a Farm' },
  { id: 'house', text: 'Build a House' },
  { id: 'assign', text: 'Assign 1 Worker' },
  { id: 'council', text: 'Build Council Hall' },
  { id: 'proposals', text: 'Summon Proposals' },
  { id: 'advance', text: 'Advance the Cycle' },
];

export default function QuestTracker({ completed }: QuestTrackerProps) {
  return (
    <div className="absolute top-24 left-[360px] z-40 pointer-events-auto hidden md:block">
      <div className="bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg w-[260px]">
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Early Quests
        </div>
        <ul className="px-3 py-2 space-y-1 text-sm">
          {QUESTS.map(q => (
            <li key={q.id} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${completed[q.id] ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {completed[q.id] ? '✓' : '•'}
              </span>
              <span>{q.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

