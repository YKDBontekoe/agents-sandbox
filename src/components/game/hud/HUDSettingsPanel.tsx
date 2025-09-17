import React, { type SVGProps } from 'react';
import { useHUDLayoutPresets, type HUDLayoutPresetIconData } from './HUDLayoutPresets';

interface HUDSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function HUDPresetIcon({ icon }: { icon: HUDLayoutPresetIconData }) {
  const { viewBox = '0 0 24 24', paths } = icon;
  return (
    <svg fill="none" stroke="currentColor" viewBox={viewBox} aria-hidden="true">
      {paths.map(({ d, strokeLinecap = 'round', strokeLinejoin = 'round', strokeWidth = 2 }) => {
        const lineCap: SVGProps<SVGPathElement>["strokeLinecap"] = strokeLinecap;
        const lineJoin = strokeLinejoin as unknown as SVGProps<SVGPathElement>["strokeLinejoin"];
        return (
          <path key={d} d={d} strokeLinecap={lineCap} strokeLinejoin={lineJoin} strokeWidth={strokeWidth} />
        );
      })}
    </svg>
  );
}

export function HUDSettingsPanel({ isOpen, onClose }: HUDSettingsPanelProps) {
  const { availablePresets, currentPreset, setPreset } = useHUDLayoutPresets();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-gray-200 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-100">HUD Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Layout Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availablePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setPreset(preset.id)}
                  className={`
                    p-3 rounded border text-left transition-colors bg-gray-800
                    ${currentPreset.id === preset.id
                      ? 'border-blue-500 bg-blue-900/40'
                      : 'border-gray-700 hover:border-gray-500'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2">
                    {preset.icon && (
                      <div className="w-4 h-4 text-gray-300">
                        <HUDPresetIcon icon={preset.icon} />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-sm text-gray-200">{preset.name}</div>
                      <div className="text-xs text-gray-400">
                        {preset.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <h3 className="text-sm font-medium mb-2">Features</h3>
            <div className="space-y-2 text-sm text-gray-400">
              {currentPreset.features.autoHide && (
                <div>• Auto-hide panels when not in use</div>
              )}
              {currentPreset.features.smartCollapse && (
                <div>• Smart panel collapsing on small screens</div>
              )}
              {currentPreset.features.contextualPanels && (
                <div>• Context-aware panel visibility</div>
              )}
              {currentPreset.features.adaptiveLayout && (
                <div>• Adaptive layout for different screen sizes</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default HUDSettingsPanel;
