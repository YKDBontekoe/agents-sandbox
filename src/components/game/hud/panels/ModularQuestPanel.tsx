import React, { useEffect, useMemo, useState } from 'react';
import { ResponsivePanel } from '@arcane/ui/responsive';
import { useHUDPanel } from '../HUDPanelRegistry';
import { useHUDLayout } from '../HUDLayoutSystem';

type QuestObjectiveStatus = 'locked' | 'in-progress' | 'complete';
type QuestChapterStatus = 'locked' | 'active' | 'complete';

interface QuestObjectiveProgress {
  status: QuestObjectiveStatus;
  progress?: { current: number; target: number };
  context?: string;
}

interface QuestChapterProgress {
  status: QuestChapterStatus;
  objectives: Record<string, QuestObjectiveProgress>;
}

interface QuestStateSnapshot {
  activeChapterId: string;
  chapterOrder: string[];
  chapters: Record<string, QuestChapterProgress>;
}

interface QuestObjectiveBlueprint {
  id: string;
  label: string;
  hint?: string;
  target?: number;
  focus?: string;
}

interface QuestChapterBlueprint {
  id: string;
  title: string;
  summary: string;
  theme: string;
  lore?: string;
  objectives: QuestObjectiveBlueprint[];
}

const QUEST_BLUEPRINTS: QuestChapterBlueprint[] = [
  {
    id: 'stabilize-food',
    title: 'Stabilize Food',
    summary: 'Secure grain production and prove the harvest before unrest takes root.',
    theme: 'Stabilize Food',
    lore: 'Farmhands, stewards, and scribes align to keep every belly fed.',
    objectives: [
      { id: 'build-farm', label: 'Raise a starter Farm', hint: 'Free during onboarding—pick fertile ground near water.', target: 1 },
      { id: 'assign-farm-worker', label: 'Assign workers to the Farm', hint: 'Open the Worker panel and slot at least one farmer.', target: 1 },
      { id: 'secure-grain-cycle', label: 'Finish a cycle with ≥20 grain', hint: 'Advance time once staffed to confirm your surplus.', target: 20 },
    ],
  },
  {
    id: 'secure-trade',
    title: 'Secure Trade',
    summary: 'Turn grain into coin by linking trade posts and a storehouse.',
    theme: 'Secure Trade',
    lore: 'Trade caravans and quartermasters weave the logistics web.',
    objectives: [
      { id: 'raise-trade-post', label: 'Build a Trade Post', hint: 'Requires a Council Hall—roads improve throughput.', target: 1 },
      { id: 'open-trade-route', label: 'Establish a trade route', hint: 'Connect two trade posts to start coin flow.', target: 1 },
      { id: 'storehouse-network', label: 'Link a Storehouse into the network', hint: 'Ensure at least one route touches a storehouse.', target: 1 },
    ],
  },
  {
    id: 'unlock-council-power',
    title: 'Unlock Council Power',
    summary: 'Seat the council, call proposals, and invest in long-term skills.',
    theme: 'Unlock Council Power',
    lore: 'Decrees, edicts, and talents broaden the council’s influence.',
    objectives: [
      { id: 'build-council-hall', label: 'Seat the Council Hall', hint: 'Place centrally so messengers reach every guild.', target: 1 },
      { id: 'summon-proposals', label: 'Summon council proposals', hint: 'Request guidance once your economy is steady.' },
      { id: 'unlock-first-skill', label: 'Unlock your first skill', hint: 'Spend coin, mana, or favor on a lasting boon.', target: 1 },
    ],
  },
  {
    id: 'command-trade-empire',
    title: 'Command the Trade Empire',
    summary: 'Scale caravans, fortify patrols, and amass the coin reserves needed for dominion-wide commerce.',
    theme: 'Trade Empire',
    lore: 'Quartermasters weave a lattice of caravans while brokers negotiate tariffs with iron resolve.',
    objectives: [
      {
        id: 'trade-network-dominance',
        label: 'Operate four concurrent trade routes',
        hint: 'Grow beyond a local loop—link distant trade posts to expand your reach.',
        target: 4,
      },
      {
        id: 'trade-hub-anchor',
        label: 'Anchor a hub with three connections',
        hint: 'Designate one trade post as the beating heart of your network—patrols keep caravans safe.',
        target: 3,
      },
      {
        id: 'coin-stockpile',
        label: 'Stockpile 600 coin reserves',
        hint: 'Tune tariffs and exports until the treasury is ready for expansion.',
        target: 600,
      },
    ],
  },
  {
    id: 'master-the-leylines',
    title: 'Master the Leylines',
    summary: 'Bind distant mana wells, stabilize the flows, and keep channels thrumming in unison.',
    theme: 'Leyline Mastery',
    lore: 'Arcanists trace sigils through the air, coaxing luminous rivers beneath the streets.',
    objectives: [
      {
        id: 'chart-leylines',
        label: 'Weave two leylines across the city',
        hint: 'Use the leyline tools to bridge sources and districts.',
        target: 2,
      },
      {
        id: 'attune-leylines',
        label: 'Maintain two active leyline channels',
        hint: 'Stabilize their anchors and toggle flows online.',
        target: 2,
      },
      {
        id: 'leyline-flow-surge',
        label: 'Reach 150 total leyline flow',
        hint: 'Upgrade conduits and balance capacity to push more mana.',
        target: 150,
      },
    ],
  },
  {
    id: 'ascension-prelude',
    title: 'Prepare the Ascension',
    summary: 'Lock in arcane mastery, weather looming crises, and chart omens before the final rite.',
    theme: 'Ascension Prep',
    lore: 'The council gathers relics, transcripts, and stellar charts to ensure the ritual does not fail.',
    objectives: [
      {
        id: 'unlock-advanced-skills',
        label: 'Unlock six council skills',
        hint: 'Invest in talents that bind infrastructure, mysticism, and trade.',
        target: 6,
      },
      {
        id: 'weather-crises',
        label: 'Endure two crises',
        hint: 'Hold firm through unrest or threat spikes without toppling the city.',
        target: 2,
      },
      {
        id: 'catalog-omens',
        label: 'Document three seasonal events',
        hint: 'Record omens from the Omenarium or seasonal reports.',
        target: 3,
      },
      {
        id: 'mana-stockpile',
        label: 'Bank 400 mana for the rite',
        hint: 'Channel leylines and shrines until the ritual stores brim.',
        target: 400,
      },
    ],
  },
];

const QUEST_BLUEPRINT_MAP = QUEST_BLUEPRINTS.reduce<Record<string, QuestChapterBlueprint>>((acc, chapter) => {
  acc[chapter.id] = chapter;
  return acc;
}, {});

const QUEST_CHAPTER_ORDER = QUEST_BLUEPRINTS.map(chapter => chapter.id);

const createInitialQuestSnapshot = (): QuestStateSnapshot => {
  const chapters: Record<string, QuestChapterProgress> = {};
  QUEST_BLUEPRINTS.forEach((chapter, index) => {
    const objectives: Record<string, QuestObjectiveProgress> = {};
    chapter.objectives.forEach(obj => {
      objectives[obj.id] = {
        status: index === 0 ? 'in-progress' : 'locked',
        progress: obj.target ? { current: 0, target: obj.target } : undefined,
      };
    });
    chapters[chapter.id] = {
      status: index === 0 ? 'active' : 'locked',
      objectives,
    };
  });

  return {
    activeChapterId: QUEST_CHAPTER_ORDER[0],
    chapterOrder: [...QUEST_CHAPTER_ORDER],
    chapters,
  };
};

interface ModularQuestPanelProps {
  questState: QuestStateSnapshot;
  variant?: 'default' | 'compact' | 'minimal';
  collapsible?: boolean;
  onSelectChapter?: (chapterId: string) => void;
}

const chapterStatusLabel: Record<QuestChapterStatus, string> = {
  locked: 'Locked',
  active: 'Active',
  complete: 'Complete',
};

const chapterStatusStyles: Record<QuestChapterStatus, string> = {
  locked: 'border-gray-700/80 bg-gray-900/50 text-gray-400',
  active: 'border-indigo-500/80 bg-indigo-500/10 text-indigo-200',
  complete: 'border-emerald-500/70 bg-emerald-500/10 text-emerald-200',
};

const objectiveIndicatorClasses: Record<QuestObjectiveStatus, string> = {
  complete: 'bg-emerald-600 text-white',
  'in-progress': 'bg-indigo-600/80 text-white',
  locked: 'bg-gray-700 text-gray-300',
};

export default function ModularQuestPanel({
  questState,
  variant = 'default',
  collapsible = true,
  onSelectChapter,
}: ModularQuestPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [visibleChapterId, setVisibleChapterId] = useState(() => questState.activeChapterId);
  const { screenSize } = useHUDLayout();
  const baseSnapshot = useMemo(() => createInitialQuestSnapshot(), []);

  useHUDPanel({
    config: {
      id: 'quest-panel',
      zone: 'sidebar-right',
      priority: 6,
      responsive: { hideOnMobile: true, collapseOnMobile: true },
      accessibility: { ariaLabel: 'Quest tracker', role: 'complementary' },
    },
    component: ModularQuestPanel,
    props: { variant, collapsible, questState },
  });

  useEffect(() => {
    setVisibleChapterId(prev => {
      if (!prev || !questState.chapterOrder.includes(prev)) {
        return questState.activeChapterId;
      }
      const status = questState.chapters[prev]?.status;
      if (status === 'locked' || (status === 'complete' && questState.activeChapterId !== prev)) {
        return questState.activeChapterId;
      }
      return prev;
    });
  }, [questState.activeChapterId, questState.chapterOrder, questState.chapters]);

  const activeChapterIndex = Math.max(0, questState.chapterOrder.indexOf(questState.activeChapterId));
  const activeBlueprint = QUEST_BLUEPRINT_MAP[questState.activeChapterId] ?? QUEST_BLUEPRINTS[0];
  const activeProgress = questState.chapters[questState.activeChapterId] ?? baseSnapshot.chapters[questState.activeChapterId];

  const nextObjective = activeBlueprint.objectives.find(obj => {
    const status = activeProgress?.objectives?.[obj.id]?.status;
    return status !== 'complete';
  });

  const visibleBlueprint = QUEST_BLUEPRINT_MAP[visibleChapterId] ?? activeBlueprint;
  const visibleProgress = questState.chapters[visibleBlueprint.id] ?? baseSnapshot.chapters[visibleBlueprint.id];

  const handleSelectChapter = (chapterId: string) => {
    setVisibleChapterId(chapterId);
    if (onSelectChapter) {
      onSelectChapter(chapterId);
    }
  };

  const totalObjectives = questState.chapterOrder.reduce((sum, chapterId) => {
    const blueprint = QUEST_BLUEPRINT_MAP[chapterId];
    return sum + (blueprint ? blueprint.objectives.length : 0);
  }, 0);

  const completedObjectives = questState.chapterOrder.reduce((sum, chapterId) => {
    const chapter = questState.chapters[chapterId];
    if (!chapter) return sum;
    return sum + Object.values(chapter.objectives).filter(obj => obj.status === 'complete').length;
  }, 0);

  const titleIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 20h10a2 2 0 002-2V6a2 2 0 00-2-2H9L7 6H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  return (
    <ResponsivePanel
      screenSize={screenSize}
      title={variant !== 'minimal' ? `Quests` : `Q`}
      icon={titleIcon}
      variant={variant}
      collapsible={collapsible}
      isCollapsed={isCollapsed}
      onToggleCollapse={() => setIsCollapsed(prev => !prev)}
      priority="low"
      actions={(
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded-full text-[10px] leading-none bg-indigo-600 text-white tabular-nums">
            {completedObjectives}/{totalObjectives}
          </span>
          {nextObjective && (
            <span
              className="max-w-[11rem] truncate px-1 py-0.5 rounded bg-gray-900/30 border border-gray-700 text-[10px] text-gray-300 hidden md:inline"
              title={nextObjective.label}
            >
              Next: {nextObjective.label}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-wide text-gray-400">
            Chapter {activeChapterIndex + 1}/{questState.chapterOrder.length}
          </span>
        </div>
      )}
      className="min-w-0"
    >
      <div className={`px-2 pt-2 ${variant === 'minimal' ? 'pb-1' : 'pb-2'}`}>
        <div className={`flex gap-1 ${variant === 'minimal' ? 'flex-wrap' : 'flex-wrap'}`}>
          {questState.chapterOrder.map((chapterId, idx) => {
            const blueprint = QUEST_BLUEPRINT_MAP[chapterId];
            const progress = questState.chapters[chapterId] ?? baseSnapshot.chapters[chapterId];
            if (!blueprint || !progress) return null;
            const isSelected = visibleChapterId === chapterId;
            const baseClasses = `${chapterStatusStyles[progress.status]} border rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`;
            const activeClasses = isSelected ? 'ring-1 ring-indigo-400/70 shadow-sm' : 'hover:border-indigo-400/60';
            return (
              <button
                key={chapterId}
                type="button"
                onClick={() => handleSelectChapter(chapterId)}
                className={`${baseClasses} ${activeClasses} px-2 py-1 flex-1 min-w-[6.5rem] text-left`}
              >
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wide">
                  <span className="tabular-nums text-gray-300/80">Ch {idx + 1}</span>
                  <span>{chapterStatusLabel[progress.status]}</span>
                </div>
                <div className="text-xs font-medium text-gray-100 truncate">{blueprint.theme}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-[11px] leading-snug text-gray-300">
          {visibleBlueprint.summary}
        </div>
        {visibleBlueprint.lore && variant !== 'minimal' && (
          <div className="mt-1 text-[10px] text-indigo-200/80 leading-snug">{visibleBlueprint.lore}</div>
        )}
      </div>

      <ul className="px-2 pb-2 space-y-2 text-xs text-gray-200">
        {visibleBlueprint.objectives.map(objective => {
          const progress = visibleProgress?.objectives?.[objective.id];
          const status = progress?.status ?? 'locked';
          const indicator = status === 'complete' ? '✓' : status === 'locked' ? '•' : '↻';
          const pct = progress?.progress && progress.progress.target > 0
            ? Math.min(100, Math.round((Math.max(progress.progress.current, 0) / progress.progress.target) * 100))
            : 0;

          return (
            <li key={objective.id} className="rounded-md border border-gray-800/60 bg-gray-900/40 px-2 py-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] ${objectiveIndicatorClasses[status]}`}>
                    {indicator}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-100 leading-snug">{objective.label}</div>
                    {objective.hint && (
                      <div className="text-[11px] text-gray-400 leading-snug">{objective.hint}</div>
                    )}
                    {progress?.context && (
                      <div className="text-[11px] text-indigo-200/80 leading-snug">{progress.context}</div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-gray-400">{chapterStatusLabel[status === 'complete' ? 'complete' : status === 'locked' ? 'locked' : 'active']}</span>
              </div>
              {progress?.progress && (
                <div className="mt-2">
                  <div className="h-1.5 rounded bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full ${status === 'complete' ? 'bg-emerald-500' : 'bg-indigo-500/80'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-400 tabular-nums">
                    {Math.min(progress.progress.current, progress.progress.target)} / {progress.progress.target}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </ResponsivePanel>
  );
}

export type {
  ModularQuestPanelProps,
  QuestStateSnapshot,
  QuestChapterProgress,
  QuestObjectiveProgress,
  QuestChapterBlueprint,
  QuestObjectiveBlueprint,
};
export { QUEST_BLUEPRINTS, createInitialQuestSnapshot };
