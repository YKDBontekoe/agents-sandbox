import { useMemo } from 'react';
import { CATEGORY_TYPES, type CategoryType } from '@arcane/ui';

import type { EdictSetting } from './types';

export interface UseEdictsPanelOptions {
  edicts: EdictSetting[];
  pendingChanges: Record<string, number>;
  currentFavor: number;
}

export interface EdictWithState {
  edict: EdictSetting;
  pendingValue: number;
  hasChanged: boolean;
  cost: number;
  isLocked: boolean;
}

export interface CategoryGroup {
  category: CategoryType;
  title: string;
  edicts: EdictWithState[];
}

export interface UseEdictsPanelResult {
  categoryGroups: CategoryGroup[];
  hasChanges: boolean;
  totalCost: number;
  canAfford: boolean;
  changesToApply: Record<string, number>;
  pendingSelection: Record<string, number>;
}

const CATEGORY_TITLES: Record<CategoryType, string> = {
  economic: 'Economic Policy',
  military: 'Military Doctrine',
  social: 'Social Order',
  mystical: 'Mystical Arts',
  diplomatic: 'Diplomacy',
  infrastructure: 'Infrastructure',
};

export const useEdictsPanel = ({
  edicts,
  pendingChanges,
  currentFavor,
}: UseEdictsPanelOptions): UseEdictsPanelResult => {
  const edictStates = useMemo<EdictWithState[]>(() => {
    return edicts.map(edict => {
      const pendingValue = pendingChanges.hasOwnProperty(edict.id)
        ? pendingChanges[edict.id]
        : edict.currentValue;
      const hasChanged = pendingValue !== edict.currentValue;
      const cost = hasChanged ? edict.cost ?? 0 : 0;

      return {
        edict,
        pendingValue,
        hasChanged,
        cost,
        isLocked: edict.isLocked ?? false,
      } satisfies EdictWithState;
    });
  }, [edicts, pendingChanges]);

  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    return CATEGORY_TYPES.map(category => {
      const edictsForCategory = edictStates.filter(entry => entry.edict.category === category);
      if (edictsForCategory.length === 0) {
        return null;
      }

      return {
        category,
        title: CATEGORY_TITLES[category],
        edicts: edictsForCategory,
      } satisfies CategoryGroup;
    }).filter((group): group is CategoryGroup => group !== null);
  }, [edictStates]);

  const totalCost = useMemo(
    () => edictStates.reduce((sum, entry) => sum + entry.cost, 0),
    [edictStates],
  );

  const changesToApply = useMemo(() => {
    return edictStates.reduce<Record<string, number>>((acc, entry) => {
      if (entry.hasChanged) {
        acc[entry.edict.id] = entry.pendingValue;
      }
      return acc;
    }, {});
  }, [edictStates]);

  const pendingSelection = useMemo(() => {
    return edictStates.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.edict.id] = entry.pendingValue;
      return acc;
    }, {});
  }, [edictStates]);

  const hasChanges = Object.keys(changesToApply).length > 0;
  const canAfford = currentFavor >= totalCost;

  return {
    categoryGroups,
    hasChanges,
    totalCost,
    canAfford,
    changesToApply,
    pendingSelection,
  };
};
