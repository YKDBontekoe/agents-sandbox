import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faWheatAwn,
  faCoins,
  faWandSparkles,
  faCrown,
  faBolt,
  faSkullCrossbones,
} from './icons';
export interface ResourceDef { icon: IconDefinition; color: string }

export const CORE_RESOURCES: Record<string, ResourceDef> = {
  grain: { icon: faWheatAwn, color: 'text-yellow-600' },
  coin: { icon: faCoins, color: 'text-amber-500' },
  mana: { icon: faWandSparkles, color: 'text-purple-500' },
  favor: { icon: faCrown, color: 'text-blue-500' },
  unrest: { icon: faBolt, color: 'text-red-500' },
  threat: { icon: faSkullCrossbones, color: 'text-red-700' },
};

export const RESOURCE_CATALOG: Record<string, ResourceDef> = { ...CORE_RESOURCES };

export type ResourceType = keyof typeof RESOURCE_CATALOG;

export const ICONS = Object.fromEntries(
  Object.entries(RESOURCE_CATALOG).map(([k, v]) => [k, v.icon])
) as Record<ResourceType, IconDefinition>;

export const COLORS = Object.fromEntries(
  Object.entries(RESOURCE_CATALOG).map(([k, v]) => [k, v.color])
) as Record<ResourceType, string>;
