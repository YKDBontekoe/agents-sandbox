import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faWheatAwn,
  faCoins,
  faWandSparkles,
  faCrown,
  faBolt,
  faSkullCrossbones,
} from './icons';
import { loadPluginsSync, type ResourceSpec } from '@/domain/plugins';

export interface ResourceDef extends ResourceSpec { icon: IconDefinition }

export const CORE_RESOURCES: Record<string, ResourceDef> = {
  grain: { icon: faWheatAwn, color: 'text-yellow-600' },
  coin: { icon: faCoins, color: 'text-amber-500' },
  mana: { icon: faWandSparkles, color: 'text-purple-500' },
  favor: { icon: faCrown, color: 'text-blue-500' },
  unrest: { icon: faBolt, color: 'text-red-500' },
  threat: { icon: faSkullCrossbones, color: 'text-red-700' },
};

const plugins = typeof window === 'undefined' ? loadPluginsSync() : [];
const modResources: Record<string, ResourceDef> = {};
for (const p of plugins) {
  if (!p.resources) continue;
  for (const [k, v] of Object.entries(p.resources)) {
    modResources[k] = { icon: v.icon as IconDefinition, color: v.color };
  }
}

export const RESOURCE_CATALOG: Record<string, ResourceDef> = {
  ...CORE_RESOURCES,
  ...modResources,
};

export type ResourceType = keyof typeof RESOURCE_CATALOG;

export const ICONS = Object.fromEntries(
  Object.entries(RESOURCE_CATALOG).map(([k, v]) => [k, v.icon])
) as Record<ResourceType, IconDefinition>;

export const COLORS = Object.fromEntries(
  Object.entries(RESOURCE_CATALOG).map(([k, v]) => [k, v.color])
) as Record<ResourceType, string>;
