'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCog, faInfoCircle, faUndo, faSave } from '@/lib/icons';
import '../../styles/design-tokens.css';
import '../../styles/animations.css';

import {
  ActionButton,
  SettingsSearchBar,
  SettingCategory,
  createSettingsConfig,
} from '@arcane/ui';
import type {
  LayoutPreset,
  SettingCategory as UISettingCategory,
  WorldCategoryOptions,
} from '@arcane/ui/settings/config';

export interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  layoutPresets: LayoutPreset[];
  currentPreset: string;
  onPresetChange: (presetId: string) => void;
  // World/game toggles (optional, to integrate game UI)
  showRoads?: boolean;
  onToggleRoads?: (value: boolean) => void;
  showCitizens?: boolean;
  onToggleCitizens?: (value: boolean) => void;
  requireRoadConfirm?: boolean;
  onToggleRoadConfirm?: (value: boolean) => void;
  edgeScrollEnabled?: boolean;
  onToggleEdgeScroll?: (value: boolean) => void;
  citizensCount?: number;
  onChangeCitizensCount?: (value: number) => void;
  citizensSeed?: number;
  onChangeCitizensSeed?: (value: number) => void;
  // Workers
  autoAssignWorkers?: boolean;
  onToggleAutoAssignWorkers?: (value: boolean) => void;
  // Inbox
  notifications?: Array<{ id: string; title: string; message: string; type: string; timestamp: number; read?: boolean }>;
  onDismissNotification?: (id: string) => void;
  onMarkNotificationRead?: (id: string) => void;
  onClearNotifications?: () => void;
  // Legacy time control props (deprecated - use TimeControlPanel instead)
  // These are kept for backward compatibility but should not be used
  simTickIntervalMs?: number;
  onChangeSimTickInterval?: (ms: number) => void;
  isAutoTicking?: boolean;
  timeRemainingSec?: number;
  onToggleAutoTicking?: (auto: boolean) => void;
  onTickNow?: () => void;
  gameSpeedMultiplier?: string;
  onChangeGameSpeed?: (speed: string) => void;
  isPaused?: boolean;
  onTogglePause?: (paused: boolean) => void;
}

// Quick actions bar
const QuickActions: React.FC<{
  onReset: () => void;
  onSave: () => void;
  hasChanges: boolean;
}> = ({ onReset, onSave, hasChanges }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-900/40 border-t border-gray-700">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <FontAwesomeIcon icon={faInfoCircle} />
        <span className="text-gray-400">Changes are saved automatically</span>
      </div>
      <div className="flex items-center gap-2">
        <ActionButton
          onClick={onReset}
          variant="secondary"
          className="text-xs px-3 py-1.5"
          disabled={!hasChanges}
        >
          <FontAwesomeIcon icon={faUndo} className="mr-1" />
          Reset
        </ActionButton>
        <ActionButton
          onClick={onSave}
          variant="primary"
          className="text-xs px-3 py-1.5"
          disabled={!hasChanges}
        >
          <FontAwesomeIcon icon={faSave} className="mr-1" />
          Save
        </ActionButton>
      </div>
    </div>
  );
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  layoutPresets,
  currentPreset,
  onPresetChange,
  showRoads,
  onToggleRoads,
  showCitizens,
  onToggleCitizens,
  requireRoadConfirm,
  onToggleRoadConfirm,
  edgeScrollEnabled,
  onToggleEdgeScroll,
  citizensCount,
  onChangeCitizensCount,
  citizensSeed,
  onChangeCitizensSeed,
  autoAssignWorkers,
  onToggleAutoAssignWorkers,
  notifications = [],
  onDismissNotification,
  onMarkNotificationRead,
  onClearNotifications,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['display', 'gameplay', 'time']));
  const [hasChanges, setHasChanges] = useState(false);

  const handleAnyChange = useCallback(() => setHasChanges(true), []);

  const categories: UISettingCategory[] = useMemo(() => {
    const worldOptions: WorldCategoryOptions = {};

    if (typeof onToggleRoads === 'function') {
      worldOptions.showRoads = {
        value: Boolean(showRoads),
        onChange: onToggleRoads,
      };
    }

    if (typeof onToggleCitizens === 'function') {
      worldOptions.showCitizens = {
        value: Boolean(showCitizens),
        onChange: onToggleCitizens,
      };
    }

    if (typeof onToggleAutoAssignWorkers === 'function') {
      worldOptions.autoAssignWorkers = {
        value: Boolean(autoAssignWorkers),
        onChange: onToggleAutoAssignWorkers,
      };
    }

    if (typeof onToggleEdgeScroll === 'function') {
      worldOptions.edgeScrollEnabled = {
        value: Boolean(edgeScrollEnabled),
        onChange: onToggleEdgeScroll,
      };
    }

    if (typeof onToggleRoadConfirm === 'function') {
      worldOptions.requireRoadConfirm = {
        value: Boolean(requireRoadConfirm),
        onChange: onToggleRoadConfirm,
      };
    }

    if (typeof onChangeCitizensCount === 'function') {
      worldOptions.citizensCount = {
        value: typeof citizensCount === 'number' ? citizensCount : 8,
        onChange: onChangeCitizensCount,
      };
    }

    if (typeof onChangeCitizensSeed === 'function') {
      worldOptions.citizensSeed = {
        value: typeof citizensSeed === 'number' ? citizensSeed : 0,
        onChange: onChangeCitizensSeed,
      };
    }

    const hasWorldSettings = Object.keys(worldOptions).length > 0;

    return createSettingsConfig({
      onAnyChange: handleAnyChange,
      display: {
        layoutPresets,
        currentPreset,
        onPresetChange,
      },
      world: hasWorldSettings ? worldOptions : undefined,
    });
  }, [
    autoAssignWorkers,
    citizensCount,
    citizensSeed,
    currentPreset,
    edgeScrollEnabled,
    handleAnyChange,
    layoutPresets,
    onChangeCitizensCount,
    onChangeCitizensSeed,
    onPresetChange,
    onToggleAutoAssignWorkers,
    onToggleCitizens,
    onToggleEdgeScroll,
    onToggleRoadConfirm,
    onToggleRoads,
    requireRoadConfirm,
    showCitizens,
    showRoads,
  ]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleReset = () => {
    // Reset all settings to defaults
    setHasChanges(false);
  };

  const handleSave = () => {
    // Save settings
    setHasChanges(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] bg-gray-800 border border-gray-700 text-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gray-900/40 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCog} className="text-primary text-xl" />
            <div>
              <h2 className="text-xl font-bold text-gray-100">Game Settings</h2>
              <p className="text-sm text-gray-400">Customize your gaming experience</p>
            </div>
          </div>
          <ActionButton
            onClick={onClose}
            variant="secondary"
            className="p-2 hover:bg-gray-700 transition-colors duration-200"
            aria-label="Close settings"
          >
            <FontAwesomeIcon icon={faTimes} />
          </ActionButton>
        </div>

        {/* Content */}
        <div className="flex flex-col h-full max-h-[calc(90vh-8rem)]">
          {/* Search Bar */}
          <div className="p-6 pb-0">
            <SettingsSearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          </div>

          {/* Settings Categories */}
          <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-4">
            {categories.map(category => (
              <SettingCategory
                key={category.id}
                category={category}
                isExpanded={expandedCategories.has(category.id)}
                onToggle={() => toggleCategory(category.id)}
                searchTerm={searchTerm}
                renderCustom={category.id === 'inbox' ? () => (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">{notifications.length} messages</span>
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-0.5 text-xs rounded border border-gray-600 text-gray-200 hover:bg-gray-700" onClick={() => onClearNotifications?.()}>Clear</button>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-700 rounded-md border border-gray-700 overflow-hidden">
                      {notifications.length === 0 && (
                        <div className="p-3 text-xs text-gray-400">No messages yet.</div>
                      )}
                      {notifications.map(n => (
                        <div key={n.id} className={`p-3 text-sm flex items-start justify-between gap-2 ${n.read ? 'bg-gray-900/30' : 'bg-indigo-900/20'} text-gray-200`}>
                          <div>
                            <div className="font-medium text-gray-100">{n.title}</div>
                            <div className="text-gray-300 text-xs">{n.message}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{new Date(n.timestamp).toLocaleString()}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            {!n.read && (<button className="px-2 py-0.5 text-[10px] rounded border border-gray-600 hover:bg-gray-700" onClick={() => onMarkNotificationRead?.(n.id)}>Mark read</button>)}
                            <button className="px-2 py-0.5 text-[10px] rounded border border-gray-600 hover:bg-gray-700" onClick={() => onDismissNotification?.(n.id)}>Dismiss</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : undefined}
              />
            ))}
          </div>

          {/* Quick Actions */}
          <QuickActions
            onReset={handleReset}
            onSave={handleSave}
            hasChanges={hasChanges}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
