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
} from '@fortawesome/free-solid-svg-icons';

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
        <div className={`flex items-center gap-1 transition-all duration-200 hover:scale-110 cursor-pointer group ${className}`}>
          <FontAwesomeIcon icon={ICONS[type]} className={`text-lg ${COLORS[type]} group-hover:animate-pulse`} />
          <span className={`font-mono text-sm ${COLORS[type]} group-hover:font-semibold`}>{value}</span>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="bg-gray-900 text-white px-2 py-1 rounded text-xs capitalize"
          sideOffset={5}
        >
          {type}: {value}
          <Tooltip.Arrow className="fill-gray-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);

export default ResourceIcon;
