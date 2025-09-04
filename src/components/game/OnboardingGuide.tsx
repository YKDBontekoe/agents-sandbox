import React from 'react';

interface OnboardingGuideProps {
  step: number;
  onClose: () => void;
}

const steps: Record<number, { title: string; details: string[] }> = {
  1: {
    title: 'Gather Food: Build a Farm',
    details: [
      'Select a grass tile and press Build → Farm.',
      'The first Farm is free. Farms produce grain each cycle.',
    ],
  },
  2: {
    title: 'Raise Helpers: Build a House',
    details: [
      'Place a House on grass to attract 5 workers.',
      'The first House is free. Workers run your buildings.',
    ],
  },
  3: {
    title: 'Get Production Going: Assign a Worker',
    details: [
      'Open the Workers box (bottom-left) and assign 1 worker to the Farm.',
      'You can adjust workers at any time.',
    ],
  },
  4: {
    title: 'Form Your Council',
    details: [
      'Place a Council Hall (free) to unlock proposals & decrees.',
      'Open Council from the Actions panel to review ideas.',
    ],
  },
  5: {
    title: 'Take an Action',
    details: [
      'Click “Summon Proposals” and accept one modest, affordable plan.',
      'Conservative choices keep Unrest & Threat low.',
    ],
  },
  6: {
    title: 'Advance the Cycle',
    details: [
      'Hit Advance in the Time panel to see your gains.',
      'Tip: keep grain stable, coin positive, and mana steady.',
    ],
  },
};

export default function OnboardingGuide({ step, onClose }: OnboardingGuideProps) {
  const content = steps[step] || steps[6];
  return (
    <div className="absolute top-24 left-4 z-50 pointer-events-auto">
      <div className="bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl w-[320px]">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Getting Started</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white">✕</button>
        </div>
        <div className="px-4 py-3">
          <div className="text-slate-900 dark:text-slate-100 font-medium mb-2">{content.title}</div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {content.details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Step {Math.min(step, 6)} of 6
          </div>
        </div>
      </div>
    </div>
  );
}

