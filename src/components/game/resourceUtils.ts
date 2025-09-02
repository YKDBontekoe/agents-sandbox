import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ICONS, COLORS, type ResourceType } from '../../lib/resources';

export type { ResourceType } from '../../lib/resources';

export function getResourceIcon(resource: ResourceType): IconDefinition {
  return ICONS[resource];
}

export function getResourceColor(resource: ResourceType): string {
  return COLORS[resource];
}

// Simulation resource helpers
export type SimResourceKey = 'grain' | 'coin' | 'mana' | 'favor' | 'population';

export interface SimResources {
  grain: number;
  coin: number;
  mana: number;
  favor: number;
  population: number;
}

export interface SimBuildingDef {
  inputs: Partial<SimResources>;
  outputs: Partial<SimResources>;
}

export interface ApplyProductionResult {
  updated: SimResources;
  shortages: Partial<SimResources>;
}

export function applyProduction(
  resources: SimResources,
  buildings: Array<{ typeId: string }>,
  catalog: Record<string, SimBuildingDef>
): ApplyProductionResult {
  const next: SimResources = { ...resources };
  const shortages: Partial<SimResources> = {};

  buildings.forEach((b) => {
    const def = catalog[b.typeId];
    if (!def) return;

    let canProduce = true;
    for (const [key, amount] of Object.entries(def.inputs) as [SimResourceKey, number | undefined][]) {
      const current = next[key] ?? 0;
      if (current < (amount ?? 0)) {
        canProduce = false;
        const deficit = (amount ?? 0) - current;
        shortages[key] = (shortages[key] ?? 0) + deficit;
      }
    }

    if (!canProduce) return;

    for (const [key, amount] of Object.entries(def.inputs) as [SimResourceKey, number | undefined][]) {
      next[key] = next[key] - (amount ?? 0);
    }
    for (const [key, amount] of Object.entries(def.outputs) as [SimResourceKey, number | undefined][]) {
      next[key] = (next[key] ?? 0) + (amount ?? 0);
    }
  });

  return { updated: next, shortages };
}

export function canAfford(cost: Partial<SimResources>, resources: SimResources): boolean {
  return (['grain', 'coin', 'mana', 'favor'] as SimResourceKey[]).every((key) => {
    const need = cost[key] ?? 0;
    return resources[key] >= need;
  });
}

export function applyCost(resources: SimResources, cost: Partial<SimResources>): SimResources {
  const next: SimResources = { ...resources };
  (['grain', 'coin', 'mana', 'favor'] as SimResourceKey[]).forEach((key) => {
    const need = cost[key] ?? 0;
    next[key] = Math.max(0, next[key] - need);
  });
  return next;
}
