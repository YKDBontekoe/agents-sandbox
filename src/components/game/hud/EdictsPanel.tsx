import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faScroll, faXmark } from '@/lib/icons';

import { CategorySection } from './panels/edicts/CategorySection';
import { useEdictsPanel } from './panels/edicts/useEdictsPanel';
import type { EdictSetting } from './panels/edicts/types';

export interface ApplyEdictChangesPayload {
  changes: Record<string, number>;
  totalCost: number;
  selection: Record<string, number>;
}

export interface EdictsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  edicts: EdictSetting[];
  pendingChanges: Record<string, number>;
  onEdictChange: (edictId: string, value: number) => void;
  onApplyChanges: (payload: ApplyEdictChangesPayload) => void;
  onResetChanges: () => void;
  currentFavor: number;
}

export const EdictsPanel: React.FC<EdictsPanelProps> = ({
  isOpen,
  onClose,
  edicts,
  pendingChanges,
  onEdictChange,
  onApplyChanges,
  onResetChanges,
  currentFavor,
}) => {
  const {
    categoryGroups,
    hasChanges,
    totalCost,
    canAfford,
    changesToApply,
    pendingSelection,
  } = useEdictsPanel({ edicts, pendingChanges, currentFavor });

  const handleApplyChanges = React.useCallback(() => {
    if (!hasChanges) return;
    onApplyChanges({
      changes: changesToApply,
      totalCost,
      selection: pendingSelection,
    });
  }, [hasChanges, onApplyChanges, changesToApply, totalCost, pendingSelection]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] data-[state=open]:opacity-100 data-[state=closed]:opacity-0 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:data-[state=open]:animate-fade-in"
        />
        <Dialog.Content
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:scale-95 motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:data-[state=open]:animate-scale-in"
        >
          <div className="bg-gray-800 text-gray-200 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faScroll} className="text-2xl" />
                <div>
                  <Dialog.Title className="text-xl font-bold text-gray-100">
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
                        canAfford ? 'text-amber-300' : 'text-rose-400'
                      }`}
                    >
                      <FontAwesomeIcon icon={faCrown} /> {totalCost} / {currentFavor}
                    </span>
                  </div>
                )}
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-100 transition-colors">
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col h-[calc(90vh-120px)]">
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-8">
                  {categoryGroups.map(group => (
                    <CategorySection
                      key={group.category}
                      category={group.category}
                      title={group.title}
                      edicts={group.edicts}
                      onChange={onEdictChange}
                    />
                  ))}
                </div>
              </div>

              {/* Footer */}
              {hasChanges && (
                <div className="border-t border-gray-700 p-4 bg-gray-900/40">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      Changes will take effect at the start of the next cycle
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={onResetChanges}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 text-sm rounded transition-colors"
                      >
                        Reset
                      </button>
                      <Tooltip.Provider>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <button
                              onClick={handleApplyChanges}
                              disabled={!canAfford}
                              className={`px-4 py-2 text-sm rounded font-medium transition-colors ${
                                canAfford
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              Apply Changes
                            </button>
                          </Tooltip.Trigger>
                          {!canAfford && (
                            <Tooltip.Portal>
                              <Tooltip.Content className="bg-gray-800 border border-gray-700 text-gray-200 px-2 py-1 rounded text-xs shadow-sm" sideOffset={5}>
                                Insufficient favor to apply changes
                                <Tooltip.Arrow className="fill-gray-800" />
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
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default EdictsPanel;
export type { EdictSetting } from './panels/edicts/types';
