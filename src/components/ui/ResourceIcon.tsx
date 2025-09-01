import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faWheatAwn,
  faCoins,
  faWandSparkles,
  faCrown,
  faBolt,
  faSkullCrossbones
} from '@/lib/icons';

export type ResourceType = 'grain' | 'coin' | 'mana' | 'favor' | 'unrest' | 'threat';

export interface ResourceIconProps {
  type: ResourceType;
  value: number;
  className?: string;
}

const ICONS: Record<ResourceType, IconDefinition> = {
  grain: faWheatAwn,
  coin: faCoins,
  mana: faWandSparkles,
  favor: faCrown,
  unrest: faBolt,
  threat: faSkullCrossbones,
};

const COLORS: Record<ResourceType, string> = {
  grain: 'text-yellow-600',
  coin: 'text-amber-500',
  mana: 'text-purple-500',
  favor: 'text-blue-500',
  unrest: 'text-red-500',
  threat: 'text-red-700',
};

export const ResourceIcon: React.FC<ResourceIconProps> = ({ type, value, className = '' }) => (
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <div className={`flex items-center gap-1 transition-transform duration-150 hover:transform hover:scale-105 cursor-pointer group will-change-transform ${className}`}>
          <FontAwesomeIcon icon={ICONS[type]} className={`text-lg ${COLORS[type]}`} />
          <span className={`font-mono text-sm ${COLORS[type]} group-hover:font-semibold transition-all duration-150`}>{value}</span>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs capitalize shadow-sm"
          sideOffset={5}
        >
          {type}: {value}
          <Tooltip.Arrow className="fill-white" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);

export default ResourceIcon;
