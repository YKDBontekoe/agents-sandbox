import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faWheatAwn,
  faCoins,
  faWandSparkles,
  faCrown,
  faBolt,
  faSkullCrossbones,
} from './icons';

export type ResourceType =
  | 'grain'
  | 'coin'
  | 'mana'
  | 'favor'
  | 'unrest'
  | 'threat';

export const ICONS: Record<ResourceType, IconDefinition> = {
  grain: faWheatAwn,
  coin: faCoins,
  mana: faWandSparkles,
  favor: faCrown,
  unrest: faBolt,
  threat: faSkullCrossbones,
};

export const COLORS: Record<ResourceType, string> = {
  grain: 'text-yellow-600',
  coin: 'text-amber-500',
  mana: 'text-purple-500',
  favor: 'text-blue-500',
  unrest: 'text-red-500',
  threat: 'text-red-700',
};
