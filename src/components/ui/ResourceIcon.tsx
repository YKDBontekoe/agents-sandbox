import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS, COLORS, type ResourceType } from '@/lib/resources';

export interface ResourceIconProps {
  type: ResourceType;
  value: number;
  /**
   * Optional delta to highlight resource changes. Positive numbers will render
   * green, negative numbers red. When provided, a badge is shown next to the
   * icon and the color of the icon/value temporarily changes.
   */
  delta?: number | null;
  className?: string;
}


export const ResourceIcon: React.FC<ResourceIconProps> = ({
  type,
  value,
  delta = null,
  className = ''
}) => {
  const colorClass =
    delta !== null && delta !== 0
      ? delta > 0
        ? 'text-emerald-600'
        : 'text-red-600'
      : COLORS[type];

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            className={`relative flex items-center gap-1 transition-transform duration-150 hover:transform hover:scale-105 cursor-pointer group will-change-transform ${className}`}
          >
            <FontAwesomeIcon
              icon={ICONS[type]}
              className={`text-lg ${colorClass} transition-colors duration-300`}
            />
            <span
              className={`font-mono text-sm ${colorClass} group-hover:font-semibold transition-all duration-150`}
            >
              {value}
            </span>
            {delta !== null && delta !== 0 && (
              <span
                className={`absolute -top-3 -right-3 text-xs font-bold ${
                  delta > 0 ? 'text-emerald-600' : 'text-red-600'
                } bg-white rounded px-1 shadow transition-opacity`}
              >
                {delta > 0 ? `+${delta}` : delta}
              </span>
            )}
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
};

export default ResourceIcon;
