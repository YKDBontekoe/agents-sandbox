import type { Citizen } from '../citizens/citizen';
import type { SimulatedBuilding } from '../buildingSimulation';
import type { SimResources } from '../../index';
import type { AIBehaviorPattern } from './types';
import type { BehaviorHistoryEntry } from './stores/behaviorHistoryStore';

export interface PatternEvaluationState {
  buildings: SimulatedBuilding[];
  resources: SimResources;
  hour: number;
}

export interface PatternEvaluationInput {
  patterns: Iterable<AIBehaviorPattern>;
  citizen: Citizen;
  relationshipsCount: number;
  state: PatternEvaluationState;
}

export interface PatternSelectionContext {
  recentHistory: ReadonlyArray<BehaviorHistoryEntry>;
  rng?: () => number;
}

const compareValues = (actual: number, operator: string, expected: number): boolean => {
  switch (operator) {
    case '<':
      return actual < expected;
    case '>':
      return actual > expected;
    case '==':
      return actual === expected;
    case '<=':
      return actual <= expected;
    case '>=':
      return actual >= expected;
    default:
      return false;
  }
};

const patternApplies = (
  pattern: AIBehaviorPattern,
  citizen: Citizen,
  relationshipsCount: number,
  state: PatternEvaluationState
): boolean => {
  return pattern.conditions.every(condition => {
    switch (condition.type) {
      case 'need': {
        const needValue = citizen.needs[condition.property as keyof typeof citizen.needs] || 0;
        return compareValues(needValue, condition.operator, condition.value);
      }
      case 'mood': {
        const moodValue = citizen.mood[condition.property as keyof typeof citizen.mood] || 0;
        return compareValues(moodValue, condition.operator, condition.value);
      }
      case 'time':
        if (condition.property === 'hour') {
          return compareValues(state.hour, condition.operator, condition.value);
        }
        return false;
      case 'social':
        return compareValues(relationshipsCount, condition.operator, condition.value);
      default:
        return false;
    }
  });
};

export const evaluateBehaviorPatterns = ({
  patterns,
  citizen,
  relationshipsCount,
  state
}: PatternEvaluationInput): AIBehaviorPattern[] => {
  const applicable: AIBehaviorPattern[] = [];

  for (const pattern of patterns) {
    if (patternApplies(pattern, citizen, relationshipsCount, state)) {
      applicable.push(pattern);
    }
  }

  return applicable.sort((a, b) => b.priority - a.priority);
};

export const selectBestPattern = (
  patterns: AIBehaviorPattern[],
  { recentHistory, rng = () => 0.5 }: PatternSelectionContext
): AIBehaviorPattern | null => {
  if (patterns.length === 0) {
    return null;
  }

  if (patterns.length === 1) {
    return patterns[0];
  }

  const weightedPatterns = patterns.map(pattern => {
    const recentUse = recentHistory.filter(entry => entry.pattern === pattern.id).length;
    const historyModifier = Math.max(0.3, 1 - recentUse * 0.2);
    const variance = 1 + (rng() - 0.5) * pattern.variance;
    return {
      pattern,
      weight: pattern.priority * historyModifier * variance
    };
  });

  return weightedPatterns.reduce((best, current) =>
    current.weight > best.weight ? current : best
  ).pattern;
};
