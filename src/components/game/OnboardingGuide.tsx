import React from 'react';

interface OnboardingGuideProps {
  step: number;
  onClose: () => void;
}

const steps: Record<
  number,
  {
    chapter: string;
    title: string;
    details: string[];
    context?: string;
  }
> = {
  1: {
    chapter: 'Stabilize Food',
    title: 'Survey the River Flats',
    details: [
      'Drag the camera across the lowlands and pick a fertile tile near water.',
      'Open Build → Farm to claim it; adjacency to rivers boosts output.',
    ],
    context: 'Reliable grain prevents unrest spikes when the cycle advances.',
  },
  2: {
    chapter: 'Stabilize Food',
    title: 'Raise a Farmstead',
    details: [
      'Your first Farm is free—confirm placement to start sowing grain.',
      'Farms feed every other plan you attempt, so protect them early.',
    ],
    context: 'Remember: farms cannot sit on forest, rock, or water tiles.',
  },
  3: {
    chapter: 'Stabilize Food',
    title: 'House the Workers',
    details: [
      'Place a House on grass to welcome five new citizens into the district.',
      'Keep Houses within a short walk of your fields to shorten commute time.',
    ],
    context: 'Idle citizens offer no yield—balance housing with job sites.',
  },
  4: {
    chapter: 'Stabilize Food',
    title: 'Staff the Fields',
    details: [
      'Open the Workers HUD and assign at least one worker to the Farm.',
      'As capacity grows, add more workers to push grain production upward.',
    ],
    context: 'Assignments stick through the next cycle; adjust as demand shifts.',
  },
  5: {
    chapter: 'Stabilize Food',
    title: 'Prove the Harvest',
    details: [
      'Advance the cycle once the farm is staffed to confirm net grain gain.',
      'Aim to end the turn with ≥ 20 grain so shortages do not trigger unrest.',
    ],
    context: 'Cycle changes also refresh trade quotas and council timers.',
  },
  6: {
    chapter: 'Secure Trade',
    title: 'Raise a Trade Post',
    details: [
      'Unlock the Trade Post (requires Council Hall) and place it near roads.',
      'Trade Posts convert surplus grain into coin for upkeep and expansion.',
    ],
    context: 'Clusters of logistics buildings thrive when linked by roads.',
  },
  7: {
    chapter: 'Secure Trade',
    title: 'Link Trade Routes',
    details: [
      'Select a Trade Post, draft a route, and connect to another post.',
      'Shorter routes cost less coin; consider patrols if threat rises.',
    ],
    context: 'Each active route nudges favor and coin—watch upkeep as they scale.',
  },
  8: {
    chapter: 'Secure Trade',
    title: 'Anchor Logistics',
    details: [
      'Build a Storehouse and ensure at least one route touches it.',
      'Storehouses boost any producer connected by road or trade network.',
    ],
    context: 'Efficient logistics let you weather later council experiments.',
  },
  9: {
    chapter: 'Unlock Council Power',
    title: 'Seat the Council',
    details: [
      'Construct a Council Hall to open decrees, edicts, and skill unlocks.',
      'Position it centrally so messengers reach every guild quickly.',
    ],
    context: 'The council grants proposals and unlocks advanced buildings.',
  },
  10: {
    chapter: 'Unlock Council Power',
    title: 'Summon Proposals',
    details: [
      'Open the Council panel and call for proposals from a guild of choice.',
      'Accept a conservative plan to keep unrest and threat under control.',
    ],
    context: 'Scribing proposals spends time; pair with a stable economy.',
  },
  11: {
    chapter: 'Unlock Council Power',
    title: 'Invest in Skills',
    details: [
      'Spend coin, mana, or favor on a skill unlock that supports your focus.',
      'Skills ripple across the city—confirm the tooltip before committing.',
    ],
    context: 'Legendary skills can redefine production; ensure inputs can cope.',
  },
};

export default function OnboardingGuide({ step, onClose }: OnboardingGuideProps) {
  const totalSteps = Object.keys(steps).length;
  const content = steps[step] || steps[totalSteps];
  return (
    <div className="absolute top-24 left-4 z-50 pointer-events-auto">
      <div className="bg-gray-800/90 border border-gray-700 rounded-lg shadow-xl w-[320px]">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-100">Getting Started</div>
          <button onClick={onClose} className="text-gray-300 hover:text-white">✕</button>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-indigo-300 mb-1">{content.chapter}</div>
          <div className="text-gray-100 font-medium mb-2">{content.title}</div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
            {content.details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
          {content.context && (
            <div className="mt-2 text-xs text-indigo-200/80">{content.context}</div>
          )}
          <div className="mt-3 text-xs text-gray-400">
            Step {Math.min(step, totalSteps)} of {totalSteps}
          </div>
        </div>
      </div>
    </div>
  );
}
