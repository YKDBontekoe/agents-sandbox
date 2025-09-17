import React from 'react';
import * as Slider from '@radix-ui/react-slider';
import * as Toggle from '@radix-ui/react-toggle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faLock } from '@/lib/icons';
import { CategoryIcon } from '@arcane/ui';

import type { EdictSetting } from './types';

export interface EdictControlProps {
  edict: EdictSetting;
  pendingValue: number;
  hasChanged: boolean;
  cost: number;
  isLocked: boolean;
  onChange: (value: number) => void;
}

export const EdictControl: React.FC<EdictControlProps> = ({
  edict,
  pendingValue,
  hasChanged,
  cost,
  isLocked,
  onChange,
}) => {
  return (
    <div
      className={`bg-gray-900/50 rounded-lg p-4 border ${
        hasChanged ? 'border-yellow-500/60' : 'border-gray-700'
      } shadow-sm text-gray-200 ${isLocked ? 'opacity-50' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <CategoryIcon category={edict.category} />
          <div>
            <h3 className="text-gray-100 font-medium">{edict.name}</h3>
            <p className="text-gray-400 text-sm">{edict.description}</p>
          </div>
        </div>
        {cost > 0 && (
          <div className="text-xs bg-yellow-900/30 text-yellow-300 border border-yellow-700/60 px-2 py-1 rounded flex items-center gap-1">
            <FontAwesomeIcon icon={faCrown} /> {cost}
          </div>
        )}
      </div>

      {/* Control */}
      <div className="mb-3">
        {edict.type === 'slider' ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Value:</span>
              <span
                className={`font-mono ${hasChanged ? 'text-amber-300' : 'text-gray-200'}`}
              >
                {pendingValue}%
              </span>
            </div>
            <Slider.Root
              value={[pendingValue]}
              onValueChange={([value]) => !isLocked && onChange(value)}
              max={100}
              step={5}
              className="relative flex items-center select-none touch-none w-full h-5"
              disabled={isLocked}
            >
              <Slider.Track className="bg-gray-700 relative grow rounded-full h-2">
                <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb
                className="block w-4 h-4 bg-gray-200 rounded-full shadow-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                aria-label="Value"
              />
            </Slider.Root>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Status:</span>
            <Toggle.Root
              pressed={pendingValue === 1}
              onPressedChange={(pressed) => !isLocked && onChange(pressed ? 1 : 0)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                pendingValue === 1
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-200'
              } ${isLocked ? 'cursor-not-allowed' : 'hover:opacity-80'}`}
              disabled={isLocked}
            >
              {pendingValue === 1 ? 'Enabled' : 'Disabled'}
            </Toggle.Root>
          </div>
        )}
      </div>

      {/* Effects */}
      <div className="space-y-1">
        <div className="text-xs text-gray-400">Effects:</div>
        {edict.effects.map((effect, index) => (
          <div key={index} className="text-xs text-gray-300 flex items-center gap-2">
            <span className="text-blue-400">{effect.resource}:</span>
            <span>{effect.impact}</span>
          </div>
        ))}
      </div>

      {/* Requirements */}
      {edict.requirements && edict.requirements.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Requirements:</div>
          {edict.requirements.map((req, index) => (
            <div key={index} className="text-xs text-gray-300">
              • {req}
            </div>
          ))}
        </div>
      )}

      {/* Lock Status */}
      {isLocked && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="text-xs text-red-400 flex items-center gap-1">
            <FontAwesomeIcon icon={faLock} /> Locked - Requirements not met
          </div>
        </div>
      )}
    </div>
  );
};

export default EdictControl;
