import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { EraGoalState, EraMitigationState, EraStatus, MilestoneSnapshot } from '@engine';
import GoalBanner from '../GoalBanner';

const createMitigation = (overrides: Partial<EraMitigationState>): EraMitigationState => ({
  id: overrides.id ?? 'test-mitigation',
  name: overrides.name ?? 'Test Mitigation',
  description: overrides.description ?? 'Mitigation description.',
  requirement: overrides.requirement ?? { citySize: 1 },
  effects: overrides.effects ?? { unrest: -1, threat: 0, manaUpkeep: 0 },
  unlocked: overrides.unlocked ?? true,
  progress: overrides.progress ?? 1,
});

const createGoal = (overrides: Partial<EraGoalState>): EraGoalState => ({
  id: overrides.id ?? 'goal-id',
  description: overrides.description ?? 'Complete the milestone.',
  metric: overrides.metric ?? 'citySize',
  target: overrides.target ?? 10,
  optional: overrides.optional,
  current: overrides.current ?? 5,
  progress: overrides.progress ?? 0.5,
  completed: overrides.completed ?? false,
});

const createEraStatus = (overrides: Partial<EraStatus> = {}): EraStatus => ({
  id: overrides.id ?? 'expansion_age',
  name: overrides.name ?? 'Age of Expansion',
  stageIndex: overrides.stageIndex ?? 1,
  description:
    overrides.description ??
    'Trade routes bloom and the outer districts swell. Balance prosperity against brewing rivalries.',
  pressures:
    overrides.pressures ??
    {
      base: { unrest: 2, threat: 2, manaUpkeep: 7 },
      mitigation: { unrest: -1, threat: -1, manaUpkeep: -1 },
      effective: { unrest: 1, threat: 1, manaUpkeep: 6 },
    },
  mitigations: overrides.mitigations ?? [
    createMitigation({ id: 'district_councils', name: 'District Councils' }),
    createMitigation({ id: 'arcane_customs', name: 'Arcane Customs', effects: { threat: -1, unrest: 0, manaUpkeep: 0 } }),
  ],
  goals:
    overrides.goals ??
    [
      createGoal({ id: 'expansion_city', description: 'Grow to eighteen core structures.', target: 18, current: 14, progress: 14 / 18 }),
      createGoal({ id: 'expansion_quests', description: 'Complete five major trade agreements.', target: 5, current: 3, progress: 0.6 }),
    ],
  progress:
    overrides.progress ?? {
      citySize: 14,
      questsCompleted: 3,
      stability: 62,
      manaReserve: 140,
      favor: 55,
    },
  overallGoalProgress: overrides.overallGoalProgress ?? 0.62,
  progressToNextEra: overrides.progressToNextEra ?? 0.68,
  nextEra:
    'nextEra' in overrides
      ? overrides.nextEra
      : {
          id: 'unrest_age',
          name: 'Age of Unrest',
          description: 'Old grievances flare and void cults test the wards.',
          requirements: { minCitySize: 24, minQuestsCompleted: 7 },
          basePressures: { unrest: 3, threat: 3, manaUpkeep: 9 },
        },
  upcomingCrises: overrides.upcomingCrises ?? ['Merchant guild feuds erupt if unrest passes 55.'],
  victoryCondition:
    overrides.victoryCondition ?? 'Fortify trade and resolve rivalries to weather the coming unrest.',
  ascensionCondition: overrides.ascensionCondition,
});

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
  }
});

describe('GoalBanner', () => {
  it('renders the current era, pressures, and objectives', () => {
    const era = createEraStatus();
    const milestones: MilestoneSnapshot = { ...era.progress };

    render(<GoalBanner era={era} milestones={milestones} questsCompleted={era.progress.questsCompleted} />);

    expect(screen.getAllByText(/Current Age: Age of Expansion/)).not.toHaveLength(0);
    const progressLabel = screen.getByText(/Progress to next age:/);
    expect(progressLabel.textContent?.replace(/\s+/g, ' ').trim()).toContain('68');

    const manaChip = screen.getByText(/Mana upkeep/);
    expect(manaChip.textContent?.replace(/\s+/g, ' ').trim()).toContain('6');
    expect(screen.getByText(/Era objectives/i)).toBeTruthy();
    const nextAge = screen.getByText(/Next age:/);
    const normalizedNextAge = nextAge.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    expect(normalizedNextAge).toContain('Age of Unrest');

    const readiness = screen.getByText(/% readiness/);
    expect(readiness.textContent?.replace(/\s+/g, ' ').trim()).toContain('68');
    expect(screen.getByText(/Upcoming crises/i)).toBeTruthy();
  });

  it('updates the banner when the dominion reaches the age of ascension', () => {
    const ascensionEra = createEraStatus({
      id: 'ascension_age',
      name: 'Age of Ascension',
      stageIndex: 3,
      progressToNextEra: 1,
      nextEra: undefined,
      ascensionCondition: 'Complete twelve grand quests and sustain stability above 80.',
      pressures: {
        base: { unrest: 4, threat: 4, manaUpkeep: 11 },
        mitigation: { unrest: -2, threat: -2, manaUpkeep: -3 },
        effective: { unrest: 2, threat: 2, manaUpkeep: 8 },
      },
      mitigations: [
        createMitigation({ id: 'crown_conclave', name: 'Crown Conclave', effects: { unrest: -2, threat: 0, manaUpkeep: 0 } }),
        createMitigation({ id: 'soul_forge', name: 'Soul Forge', effects: { manaUpkeep: -3, unrest: 0, threat: 0 } }),
      ],
      goals: [
        createGoal({ id: 'ascension_quests', description: 'Complete twelve grand quests.', target: 12, current: 12, progress: 1, completed: true }),
        createGoal({ id: 'ascension_stability', description: 'Maintain stability above 80.', target: 80, current: 84, progress: 1.05, completed: true }),
      ],
      progress: {
        citySize: 44,
        questsCompleted: 12,
        stability: 84,
        manaReserve: 320,
        favor: 160,
      },
      overallGoalProgress: 1,
      victoryCondition: 'Complete the ascension rite to secure the Dominion’s legacy.',
    });

    const initialEra = createEraStatus();
    const { rerender } = render(
      <GoalBanner era={initialEra} milestones={initialEra.progress} questsCompleted={3} />
    );

    rerender(
      <GoalBanner
        era={ascensionEra}
        milestones={ascensionEra.progress}
        questsCompleted={ascensionEra.progress.questsCompleted}
      />
    );

    expect(screen.getByText(/Age of Ascension/)).toBeTruthy();
    expect(screen.queryByText(/Next age:/)).toBeNull();
    expect(screen.getByText(/Ascension:/)).toBeTruthy();
    expect(screen.getByText(/Era victory/)).toBeTruthy();
  });
});
