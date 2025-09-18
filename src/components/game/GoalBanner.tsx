import { useEffect, useMemo, useState } from 'react';
import type { EraStatus, MilestoneSnapshot } from '@engine';

const DISMISSED_KEY = 'ad_goal_banner_dismissed';
const COLLAPSED_KEY = 'ad_goal_banner_collapsed';

interface GoalBannerProps {
  era?: EraStatus;
  milestones?: MilestoneSnapshot;
  questsCompleted?: number;
}

const formatPressure = (value: number): string => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
};

const toPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
};

export default function GoalBanner({ era, milestones, questsCompleted }: GoalBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === '1');
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
    } catch {}
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch {}
  };

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  const summaryLine = useMemo(() => {
    if (!era) {
      return 'Hold the Dominion—sustain mana reserves and keep unrest and threat in check.';
    }
    const { effective, mitigation } = era.pressures;
    const manaText = `Mana upkeep ${formatPressure(effective.manaUpkeep)}`;
    const unrestText = `Unrest +${formatPressure(effective.unrest)}`;
    const threatText = `Threat +${formatPressure(effective.threat)}`;
    const mitigationHints: string[] = [];
    if (Math.abs(mitigation.manaUpkeep) > 0.05) {
      mitigationHints.push(`−${formatPressure(Math.abs(mitigation.manaUpkeep))} mana from mitigations`);
    }
    if (Math.abs(mitigation.unrest) > 0.05) {
      mitigationHints.push(`${mitigation.unrest < 0 ? '−' : '+'}${formatPressure(Math.abs(mitigation.unrest))} unrest pressure`);
    }
    if (Math.abs(mitigation.threat) > 0.05) {
      mitigationHints.push(`${mitigation.threat < 0 ? '−' : '+'}${formatPressure(Math.abs(mitigation.threat))} threat pressure`);
    }
    const mitigationText = mitigationHints.length > 0 ? ` (${mitigationHints.join(', ')})` : '';
    return `Current Age: ${era.name} — ${manaText}, ${unrestText}, ${threatText}${mitigationText}`;
  }, [era]);

  const currentMilestones = useMemo(() => {
    const snapshot = milestones ?? era?.progress;
    if (!snapshot) return null;
    return {
      citySize: snapshot.citySize,
      questsCompleted: snapshot.questsCompleted,
      stability: Math.round(snapshot.stability),
      manaReserve: Math.round(snapshot.manaReserve),
      favor: Math.round(snapshot.favor)
    };
  }, [era?.progress, milestones]);

  if (dismissed) return null;

  const goals = era?.goals ?? [];

  return (
    <div className="w-full bg-indigo-700 text-white text-sm px-4 py-3 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          {collapsed ? (
            <button
              type="button"
              onClick={toggleCollapse}
              className="text-left font-medium hover:text-indigo-100 focus:outline-none focus:ring-2 focus:ring-white/60 rounded"
            >
              {summaryLine}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold text-base">
                    {era ? `Current Age: ${era.name}` : 'Dominion Goals'}
                  </span>
                  {era ? (
                    <span className="text-xs text-indigo-200">
                      Progress to next age: {toPercent(era.progressToNextEra)}%
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-indigo-100">
                  {era?.description ?? 'Hold the Dominion as long as you can—balance mana, quell unrest, and weather the threats at the gates.'}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {era ? (
                  <>
                    <span className="bg-indigo-600/70 px-2 py-1 rounded border border-indigo-400/40">
                      Mana upkeep <span className="font-semibold">{formatPressure(era.pressures.effective.manaUpkeep)}</span>
                    </span>
                    <span className="bg-indigo-600/70 px-2 py-1 rounded border border-indigo-400/40">
                      Unrest +<span className="font-semibold">{formatPressure(era.pressures.effective.unrest)}</span>
                    </span>
                    <span className="bg-indigo-600/70 px-2 py-1 rounded border border-indigo-400/40">
                      Threat +<span className="font-semibold">{formatPressure(era.pressures.effective.threat)}</span>
                    </span>
                    {currentMilestones ? (
                      <span className="bg-indigo-600/40 px-2 py-1 rounded border border-indigo-300/30">
                        City size <span className="font-semibold">{currentMilestones.citySize}</span>
                      </span>
                    ) : null}
                    {typeof (questsCompleted ?? currentMilestones?.questsCompleted) === 'number' ? (
                      <span className="bg-indigo-600/40 px-2 py-1 rounded border border-indigo-300/30">
                        Quests <span className="font-semibold">{questsCompleted ?? currentMilestones?.questsCompleted}</span>
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="bg-indigo-600/70 px-2 py-1 rounded border border-indigo-400/40">
                    Keep unrest &lt; 80 and threat &lt; 70 to stave off collapse.
                  </span>
                )}
              </div>

              {goals.length > 0 ? (
                <div>
                  <div className="text-xs uppercase tracking-wide text-indigo-200">Era objectives</div>
                  <div className="mt-2 space-y-2">
                    {goals.map(goal => {
                      const percent = toPercent(goal.progress);
                      return (
                        <div key={goal.id} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[13px]">
                            <span className="truncate">{goal.description}</span>
                            <span className="font-semibold text-indigo-100">{percent}%</span>
                          </div>
                          <div className="w-full h-2 bg-indigo-900/60 rounded">
                            <div
                              className={`h-2 rounded ${goal.completed ? 'bg-emerald-400' : 'bg-indigo-300'}`}
                              style={{ width: `${percent}%` }}
                              aria-hidden
                            />
                          </div>
                          <div className="text-[11px] text-indigo-200">
                            {Math.round(goal.current)} / {goal.target}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {era?.mitigations?.length ? (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-indigo-200">Mitigations</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {era.mitigations.map(mitigation => {
                      const effectParts: string[] = [];
                      if (mitigation.effects.manaUpkeep) {
                        effectParts.push(`Mana ${mitigation.effects.manaUpkeep > 0 ? '+' : ''}${formatPressure(mitigation.effects.manaUpkeep)}`);
                      }
                      if (mitigation.effects.unrest) {
                        effectParts.push(`Unrest ${mitigation.effects.unrest > 0 ? '+' : ''}${formatPressure(mitigation.effects.unrest)}`);
                      }
                      if (mitigation.effects.threat) {
                        effectParts.push(`Threat ${mitigation.effects.threat > 0 ? '+' : ''}${formatPressure(mitigation.effects.threat)}`);
                      }
                      return (
                        <div
                          key={mitigation.id}
                          className={`rounded border px-3 py-2 text-xs transition-colors ${mitigation.unlocked ? 'border-emerald-400/60 bg-emerald-500/20' : 'border-indigo-400/40 bg-indigo-900/40'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm">{mitigation.name}</span>
                            <span className={`text-[11px] ${mitigation.unlocked ? 'text-emerald-200' : 'text-indigo-200'}`}>
                              {mitigation.unlocked ? 'Unlocked' : `${toPercent(mitigation.progress)}%`}
                            </span>
                          </div>
                          <div className="text-[11px] text-indigo-100/90 mt-1 leading-relaxed">
                            {mitigation.description}
                            {effectParts.length > 0 ? (
                              <span className="block text-indigo-200/80 mt-1">Effects: {effectParts.join(', ')}</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {era?.nextEra ? (
                <div className="rounded border border-indigo-300/40 bg-indigo-900/40 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">Next age: {era.nextEra.name}</span>
                    <span className="text-indigo-200">{toPercent(era.progressToNextEra)}% readiness</span>
                  </div>
                  <div className="mt-1 text-indigo-100/90 leading-relaxed">
                    Requires city size {era.nextEra.requirements.minCitySize} and {era.nextEra.requirements.minQuestsCompleted} quests complete.
                  </div>
                </div>
              ) : null}

              {era?.upcomingCrises?.length ? (
                <div>
                  <div className="text-xs uppercase tracking-wide text-indigo-200">Upcoming crises</div>
                  <ul className="mt-1 list-disc list-inside text-[13px] text-indigo-100 space-y-1">
                    {era.upcomingCrises.map(crisis => (
                      <li key={crisis}>{crisis}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {era?.victoryCondition ? (
                <div className="text-xs text-indigo-100">
                  <span className="font-semibold">Era victory:</span> {era.victoryCondition}
                </div>
              ) : null}
              {era?.ascensionCondition ? (
                <div className="text-xs text-indigo-100">
                  <span className="font-semibold">Ascension:</span> {era.ascensionCondition}
                </div>
              ) : null}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleCollapse}
            className="text-white hover:text-indigo-200 text-xs underline"
          >
            {collapsed ? 'Show' : 'Hide'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-white hover:text-indigo-200"
            aria-label="Dismiss goal banner"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

