import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Slider from '@radix-ui/react-slider';
import * as Toggle from '@radix-ui/react-toggle';
import * as Tooltip from '@radix-ui/react-tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faScroll, faXmark, faLock } from '@/lib/icons';
import { CategoryIcon } from '../ui';

export interface EdictSetting {
  id: string;
  name: string;
  description: string;
  type: 'slider' | 'toggle';
  category: 'economic' | 'military' | 'social' | 'mystical';
  currentValue: number; // 0-100 for sliders, 0/1 for toggles
  defaultValue: number;
  cost?: number; // Favor cost to change
  effects: {
    resource: string;
    impact: string; // e.g., "+10% grain production", "-5 unrest per cycle"
  }[];
  requirements?: string[];
  isLocked?: boolean;
}

export interface EdictsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  edicts: EdictSetting[];
  pendingChanges: Record<string, number>;
  onEdictChange: (edictId: string, value: number) => void;
  onApplyChanges: () => void;
  onResetChanges: () => void;
  currentFavor: number;
  totalCost: number;
}

const EdictControl: React.FC<{
  edict: EdictSetting;
  currentValue: number;
  pendingValue: number;
  onChange: (value: number) => void;
  isLocked: boolean;
}> = ({ edict, currentValue, pendingValue, onChange, isLocked }) => {
  const hasChanged = currentValue !== pendingValue;
  const cost = hasChanged ? (edict.cost || 0) : 0;

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border ${
      hasChanged ? 'border-yellow-500' : 'border-gray-700'
    } ${isLocked ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <CategoryIcon category={edict.category} />
          <div>
            <h3 className="text-white font-medium">{edict.name}</h3>
            <p className="text-gray-400 text-sm">{edict.description}</p>
          </div>
        </div>
        {cost > 0 && (
          <div className="text-xs bg-yellow-600 text-white px-2 py-1 rounded flex items-center gap-1">
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
              <span className={`font-mono ${
                hasChanged ? 'text-yellow-400' : 'text-white'
              }`}>
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
                className="block w-4 h-4 bg-white rounded-full shadow-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                  : 'bg-gray-600 text-gray-300'
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

const CategorySection: React.FC<{
  category: EdictSetting['category'];
  edicts: EdictSetting[];
  pendingChanges: Record<string, number>;
  onChange: (edictId: string, value: number) => void;
}> = ({ category, edicts, pendingChanges, onChange }) => {
  const categoryEdicts = edicts.filter(e => e.category === category);
  
  if (categoryEdicts.length === 0) return null;

  const categoryNames = {
    economic: 'Economic Policy',
    military: 'Military Doctrine',
    social: 'Social Order',
    mystical: 'Mystical Arts'
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <CategoryIcon category={category} />
        {categoryNames[category]}
      </h2>
      <div className="grid gap-4">
        {categoryEdicts.map(edict => (
          <EdictControl
            key={edict.id}
            edict={edict}
            currentValue={edict.currentValue}
            pendingValue={pendingChanges[edict.id] ?? edict.currentValue}
            onChange={(value) => onChange(edict.id, value)}
            isLocked={edict.isLocked || false}
          />
        ))}
      </div>
    </div>
  );
};

export const EdictsPanel: React.FC<EdictsPanelProps> = ({
  isOpen,
  onClose,
  edicts,
  pendingChanges,
  onEdictChange,
  onApplyChanges,
  onResetChanges,
  currentFavor,
  totalCost
}) => {
  const hasChanges = Object.keys(pendingChanges).length > 0;
  const canAfford = currentFavor >= totalCost;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 rounded-lg shadow-xl z-50 w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faScroll} className="text-2xl" />
              <div>
                <Dialog.Title className="text-xl font-bold text-white">
                  Royal Edicts
                </Dialog.Title>
                <Dialog.Description className="text-gray-400 text-sm">
                  Adjust policies and doctrines that will take effect next cycle
                </Dialog.Description>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Cost Display */}
              {hasChanges && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Cost:</span>
                  <span
                    className={`font-mono text-sm flex items-center gap-1 ${
                      canAfford ? 'text-yellow-400' : 'text-red-400'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCrown} /> {totalCost} / {currentFavor}
                  </span>
                </div>
              )}
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col h-[calc(90vh-120px)]">
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-8">
                {(['economic', 'military', 'social', 'mystical'] as const).map(category => (
                  <CategorySection
                    key={category}
                    category={category}
                    edicts={edicts}
                    pendingChanges={pendingChanges}
                    onChange={onEdictChange}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            {hasChanges && (
              <div className="border-t border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Changes will take effect at the start of the next cycle
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onResetChanges}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                    >
                      Reset
                    </button>
                    <Tooltip.Provider>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button
                            onClick={onApplyChanges}
                            disabled={!canAfford}
                            className={`px-4 py-2 text-sm rounded font-medium transition-colors ${
                              canAfford
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Apply Changes
                          </button>
                        </Tooltip.Trigger>
                        {!canAfford && (
                          <Tooltip.Portal>
                            <Tooltip.Content
                              className="bg-gray-900 text-white px-2 py-1 rounded text-xs"
                              sideOffset={5}
                            >
                              Insufficient favor to apply changes
                              <Tooltip.Arrow className="fill-gray-900" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        )}
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default EdictsPanel;