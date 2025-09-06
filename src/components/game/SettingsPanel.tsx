'use client';

import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faTimes,
  faCog,
  faSearch,
  faDesktop,
  faGamepad,
  faVolumeUp,
  faUniversalAccess,
  faInfoCircle,
  faChevronDown,
  faChevronRight,
  faCheck,
  faUndo,
  faSave
} from '@/lib/icons';
import { ActionButton } from '../ui';
import '../../styles/design-tokens.css';
import '../../styles/animations.css';

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  icon?: IconDefinition;
}

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
  // Game speed (server tick interval)
  simTickIntervalMs?: number;
  onChangeSimTickInterval?: (ms: number) => void;
  // Time control
  isAutoTicking?: boolean;
  timeRemainingSec?: number;
  onToggleAutoTicking?: (auto: boolean) => void;
  onTickNow?: () => void;
}

// Settings categories for better organization
interface SettingCategory {
  id: string;
  name: string;
  icon: IconDefinition;
  description: string;
  settings: SettingItem[];
}

type SettingValue = string | number | boolean;

interface SettingItem {
  id: string;
  name: string;
  description: string;
  type: 'toggle' | 'select' | 'range' | 'preset' | 'number';
  value: SettingValue;
  options?: { value: SettingValue; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: SettingValue) => void;
}

// Search functionality
const SearchBar: React.FC<{
  searchTerm: string;
  onSearchChange: (term: string) => void;
}> = ({ searchTerm, onSearchChange }) => {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
      </div>
      <input
        type="text"
        placeholder="Search settings..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        aria-label="Search settings"
      />
    </div>
  );
};

// Collapsible category section
const CategorySection: React.FC<{
  category: SettingCategory;
  isExpanded: boolean;
  onToggle: () => void;
  searchTerm: string;
  renderCustom?: () => React.ReactNode;
}> = ({ category, isExpanded, onToggle, searchTerm, renderCustom }) => {
  const filteredSettings = useMemo(() => {
    if (!searchTerm) return category.settings;
    return category.settings.filter(setting => 
      setting.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [category.settings, searchTerm]);

  if (searchTerm && filteredSettings.length === 0) return null;

  return (
    <div className="mb-4 bg-gray-900/30 border border-gray-700 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-800/80 hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset text-gray-200"
        aria-expanded={isExpanded}
        aria-controls={`category-${category.id}`}
      >
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={category.icon} className="text-primary" />
          <div className="text-left">
            <h3 className="font-semibold text-gray-100">{category.name}</h3>
            <p className="text-xs text-gray-400">{category.description}</p>
          </div>
        </div>
        <FontAwesomeIcon 
          icon={isExpanded ? faChevronDown : faChevronRight} 
          className="text-gray-400 transition-transform duration-200"
        />
      </button>
      
      {isExpanded && (
        <div id={`category-${category.id}`} className="p-4 space-y-4 animate-slide-down">
          {category.id === 'inbox' && renderCustom ? (
            renderCustom()
          ) : (
            filteredSettings.map(setting => (
              <SettingControl key={setting.id} setting={setting} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Individual setting control component
const SettingControl: React.FC<{ setting: SettingItem }> = ({ setting }) => {
  const renderControl = () => {
    switch (setting.type) {
      case 'toggle':
        return (
          <button
            onClick={() => setting.onChange(!setting.value)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              setting.value ? 'bg-primary' : 'bg-border'
            }`}
            role="switch"
            aria-checked={Boolean(setting.value)}
            aria-labelledby={`setting-${setting.id}-label`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                setting.value ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        );
      
      case 'select':
        return (
          <select
            value={String(setting.value)}
            onChange={(e) => setting.onChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            aria-labelledby={`setting-${setting.id}-label`}
          >
            {setting.options?.map(option => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'range':
        return (
          <div className="flex items-center gap-3 flex-1">
            <input
              type="range"
              min={setting.min}
              max={setting.max}
              step={setting.step}
              value={Number(setting.value)}
              onChange={(e) => setting.onChange(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              aria-labelledby={`setting-${setting.id}-label`}
            />
            <span className="min-w-[3rem] text-sm font-mono text-gray-200 text-right">
              {setting.value}
            </span>
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={Number(setting.value)}
            onChange={(e) => setting.onChange(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 w-36"
            aria-labelledby={`setting-${setting.id}-label`}
          />
        );
      
      case 'preset':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {setting.options?.map(option => (
              <button
                key={String(option.value)}
                onClick={() => setting.onChange(option.value)}
                className={`px-3 py-2 rounded-lg border transition-all duration-200 text-sm font-medium ${
                  setting.value === option.value
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                    : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700 hover:border-blue-500/50'
                }`}
                aria-pressed={setting.value === option.value}
              >
                {setting.value === option.value && (
                  <FontAwesomeIcon icon={faCheck} className="mr-2" />
                )}
                {option.label}
              </button>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-900/20 rounded-lg border border-gray-700 hover:bg-gray-900/30 transition-colors duration-200">
      <div className="flex-1">
        <label 
          id={`setting-${setting.id}-label`}
          className="block font-medium text-gray-200 mb-1"
        >
          {setting.name}
        </label>
        <p className="text-xs text-gray-400">{setting.description}</p>
      </div>
      <div className="flex-shrink-0">
        {renderControl()}
      </div>
    </div>
  );
};

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
  simTickIntervalMs,
  onChangeSimTickInterval,
  isAutoTicking,
  timeRemainingSec,
  onToggleAutoTicking,
  onTickNow,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['display', 'gameplay']));
  const [hasChanges, setHasChanges] = useState(false);

  // Mock settings data - in a real app, this would come from props or context
  const categories: SettingCategory[] = useMemo(() => [
    {
      id: 'inbox',
      name: 'Inbox',
      icon: faInfoCircle,
      description: 'Notifications & history',
      settings: []
    },
    // World category (game UI controls)
    {
      id: 'world',
      name: 'World',
      icon: faGamepad,
      description: 'Map, citizens, and building preferences',
      settings: [
        {
          id: 'show-roads',
          name: 'Show Roads',
          description: 'Toggle road overlays on the map',
          type: 'toggle',
          value: Boolean(showRoads),
          onChange: (v: SettingValue) => { onToggleRoads?.(Boolean(v)); setHasChanges(true); }
        },
        {
          id: 'show-citizens',
          name: 'Show Citizens',
          description: 'Toggle citizen activity markers',
          type: 'toggle',
          value: Boolean(showCitizens),
          onChange: (v: SettingValue) => { onToggleCitizens?.(Boolean(v)); setHasChanges(true); }
        },
        {
          id: 'auto-assign-workers',
          name: 'Auto-Assign Workers',
          description: 'Automatically assign idle workers to best available jobs',
          type: 'toggle',
          value: Boolean(autoAssignWorkers),
          onChange: (v: SettingValue) => { onToggleAutoAssignWorkers?.(Boolean(v)); setHasChanges(true); }
        },
        {
          id: 'edge-scroll',
          name: 'Edge Scroll Panning',
          description: 'Pan camera when cursor nears screen edge',
          type: 'toggle',
          value: Boolean(edgeScrollEnabled),
          onChange: (v: SettingValue) => { onToggleEdgeScroll?.(Boolean(v)); setHasChanges(true); }
        },
        {
          id: 'confirm-roads',
          name: 'Confirm Roads Before Building',
          description: 'Ask for approval when citizens propose roads',
          type: 'toggle',
          value: Boolean(requireRoadConfirm),
          onChange: (v: SettingValue) => { onToggleRoadConfirm?.(Boolean(v)); setHasChanges(true); }
        },
        {
          id: 'citizens-count',
          name: 'Citizens Count',
          description: 'Number of active citizens (applies immediately)',
          type: 'range',
          value: Number(citizensCount ?? 8),
          min: 2,
          max: 20,
          step: 1,
          onChange: (v: SettingValue) => { onChangeCitizensCount?.(Number(v)); setHasChanges(true); }
        },
        {
          id: 'citizens-seed',
          name: 'Citizens Seed',
          description: 'Randomization seed for citizens (movement variance)',
          type: 'number',
          value: Number(citizensSeed ?? 0),
          onChange: (v: SettingValue) => { onChangeCitizensSeed?.(Number(v)); setHasChanges(true); }
        },
      ]
    },
    {
      id: 'display',
      name: 'Display & Graphics',
      icon: faDesktop,
      description: 'Visual settings and performance options',
      settings: [
        {
          id: 'layout-preset',
          name: 'Layout Preset',
          description: 'Choose your preferred HUD layout',
          type: 'preset',
          value: currentPreset,
          options: layoutPresets.map(preset => ({ value: preset.id, label: preset.name })),
          onChange: (value: SettingValue) => {
            onPresetChange(value as string);
            setHasChanges(true);
          }
        },
        {
          id: 'quality',
          name: 'Graphics Quality',
          description: 'Adjust visual quality for performance',
          type: 'select',
          value: 'high',
          options: [
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'ultra', label: 'Ultra' }
          ],
          onChange: (value: SettingValue) => setHasChanges(true)
        },
        {
          id: 'fps-limit',
          name: 'FPS Limit',
          description: 'Maximum frames per second',
          type: 'range',
          value: 60,
          min: 30,
          max: 120,
          step: 10,
          onChange: (value: SettingValue) => setHasChanges(true)
        },
        {
          id: 'vsync',
          name: 'V-Sync',
          description: 'Synchronize with monitor refresh rate',
          type: 'toggle',
          value: true,
          onChange: (value: SettingValue) => setHasChanges(true)
        },
        {
          id: 'fullscreen',
          name: 'Fullscreen Mode',
          description: 'Run game in fullscreen',
          type: 'toggle',
          value: false,
          onChange: (value: SettingValue) => setHasChanges(true)
        }
      ]
    },
    {
      id: 'gameplay',
      name: 'Gameplay',
      icon: faGamepad,
      description: 'Game mechanics and difficulty settings',
      settings: [
        {
          id: 'auto-pause',
          name: 'Auto-Pause Events',
          description: 'Automatically pause on important events',
          type: 'toggle',
          value: true,
          onChange: (value: SettingValue) => setHasChanges(true)
        },
        {
          id: 'tutorial-hints',
          name: 'Tutorial Hints',
          description: 'Show helpful tips and guidance',
          type: 'toggle',
          value: true,
          onChange: (value: SettingValue) => setHasChanges(true)
        },
        {
          id: 'difficulty',
          name: 'Difficulty Level',
          description: 'Adjust game challenge',
          type: 'select',
          value: 'normal',
          options: [
            { value: 'easy', label: 'Easy' },
            { value: 'normal', label: 'Normal' },
            { value: 'hard', label: 'Hard' },
            { value: 'expert', label: 'Expert' }
          ],
          onChange: (value: SettingValue) => setHasChanges(true)
        }
      ]
    },
    {
      id: 'audio',
      name: 'Audio',
      icon: faVolumeUp,
      description: 'Sound and music settings',
      settings: [
        {
          id: 'master-volume',
          name: 'Master Volume',
          description: 'Overall audio level',
          type: 'range',
          value: 80,
          min: 0,
          max: 100,
          step: 5,
          onChange: (value: SettingValue) => setHasChanges(true)
        },
        {
          id: 'music-volume',
          name: 'Music Volume',
          description: 'Background music level',
          type: 'range',
          value: 60,
          min: 0,
          max: 100,
          step: 5,
          onChange: (value: SettingValue) => setHasChanges(true)
        },
        {
          id: 'sfx-volume',
          name: 'Sound Effects',
          description: 'Game sound effects level',
          type: 'range',
          value: 80,
          min: 0,
          max: 100,
          step: 5,
          onChange: (value: SettingValue) => setHasChanges(true)
        },
        {
          id: 'mute-background',
          name: 'Mute When Inactive',
          description: 'Mute audio when game is not focused',
          type: 'toggle',
          value: true,
          onChange: (value: SettingValue) => setHasChanges(true)
        }
      ]
    },
    {
      id: 'accessibility',
      name: 'Accessibility',
      icon: faUniversalAccess,
      description: 'Options to improve game accessibility',
      settings: [
        {
          id: 'high-contrast',
          name: 'High Contrast Mode',
          description: 'Increase visual contrast for better visibility',
          type: 'toggle',
          value: false,
          onChange: (value: SettingValue) => setHasChanges(true)
        },
        {
          id: 'large-text',
          name: 'Large Text',
          description: 'Increase text size throughout the interface',
          type: 'toggle',
          value: false,
          onChange: (value: SettingValue) => setHasChanges(true)
        },
        {
          id: 'reduced-motion',
          name: 'Reduce Motion',
          description: 'Minimize animations and transitions',
          type: 'toggle',
          value: false,
          onChange: (value: SettingValue) => setHasChanges(true)
        },
        {
          id: 'screen-reader',
          name: 'Screen Reader Support',
          description: 'Enhanced support for screen readers',
          type: 'toggle',
          value: false,
          onChange: (value: SettingValue) => setHasChanges(true)
        },
        {
          id: 'colorblind-support',
          name: 'Colorblind Support',
          description: 'Alternative color schemes for colorblind users',
          type: 'select',
          value: 'none',
          options: [
            { value: 'none', label: 'None' },
            { value: 'protanopia', label: 'Protanopia' },
            { value: 'deuteranopia', label: 'Deuteranopia' },
            { value: 'tritanopia', label: 'Tritanopia' }
          ],
          onChange: (value: SettingValue) => setHasChanges(true)
        }
      ]
    }
  ], [currentPreset, layoutPresets, onPresetChange]);

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
            <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          </div>

          {/* Settings Categories */}
          <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-4">
            {categories.map(category => (
              <CategorySection
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
