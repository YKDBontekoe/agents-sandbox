import React, { useState } from 'react';
import { ResponsivePanel } from '../ResponsiveHUDPanels';
import { useHUDPanel } from '../HUDPanelRegistry';

interface ModularQuestPanelProps {
  completed: Record<string, boolean>;
  variant?: 'default' | 'compact' | 'minimal';
  collapsible?: boolean;
}

const QUESTS: Array<{ id: string; text: string }> = [
  { id: 'farm', text: 'Build a Farm' },
  { id: 'house', text: 'Build a House' },
  { id: 'assign', text: 'Assign 1 Worker' },
  { id: 'council', text: 'Build Council Hall' },
  { id: 'proposals', text: 'Summon Proposals' },
  { id: 'advance', text: 'Advance the Cycle' },
];

export default function ModularQuestPanel({ completed, variant = 'default', collapsible = true }: ModularQuestPanelProps) {
  // Default to collapsed; users can peek as needed
  const [isCollapsed, setIsCollapsed] = useState(true);

  useHUDPanel({
    config: {
      id: 'quest-panel',
      zone: 'sidebar-right',
      priority: 6,
      responsive: { hideOnMobile: true },
      accessibility: { ariaLabel: 'Quest tracker', role: 'complementary' }
    },
    component: ModularQuestPanel,
    props: { variant, collapsible }
  });

  const titleIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 20h10a2 2 0 002-2V6a2 2 0 00-2-2H9L7 6H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  return (
    <ResponsivePanel
      title={variant !== 'minimal' ? 'Quests' : 'Qst'}
      icon={titleIcon}
      variant={variant}
      collapsible={collapsible}
      isCollapsed={isCollapsed}
      onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      priority="low"
      className="min-w-0"
    >
      <ul className="px-1 py-1 space-y-1 text-xs">
        {QUESTS.map(q => (
          <li key={q.id} className="flex items-center gap-2 text-slate-700">
            <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${completed[q.id] ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {completed[q.id] ? '✓' : '•'}
            </span>
            <span className="truncate">{q.text}</span>
          </li>
        ))}
      </ul>
    </ResponsivePanel>
  );
}

export type { ModularQuestPanelProps };
