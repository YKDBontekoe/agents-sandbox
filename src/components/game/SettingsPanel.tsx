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
  type: 'toggle' | 'select' | 'range' | 'preset';
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
        <FontAwesomeIcon icon={faSearch} className="text-muted" />
      </div>
      <input
        type="text"
        placeholder="Search settings..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-10 pr-4 py-3 bg-panel border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
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
}> = ({ category, isExpanded, onToggle, searchTerm }) => {
  const filteredSettings = useMemo(() => {
    if (!searchTerm) return category.settings;
    return category.settings.filter(setting => 
      setting.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [category.settings, searchTerm]);

  if (searchTerm && filteredSettings.length === 0) return null;

  return (
    <div className="mb-4 bg-panel/50 border border-border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-panel/80 hover:bg-panel transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
        aria-expanded={isExpanded}
        aria-controls={`category-${category.id}`}
      >
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={category.icon} className="text-primary" />
          <div className="text-left">
            <h3 className="font-semibold text-foreground">{category.name}</h3>
            <p className="text-xs text-muted">{category.description}</p>
          </div>
        </div>
        <FontAwesomeIcon 
          icon={isExpanded ? faChevronDown : faChevronRight} 
          className="text-muted transition-transform duration-200"
        />
      </button>
      
      {isExpanded && (
        <div id={`category-${category.id}`} className="p-4 space-y-4 animate-slide-down">
          {filteredSettings.map(setting => (
            <SettingControl key={setting.id} setting={setting} />
          ))}
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
            className="bg-panel border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
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
              className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
              aria-labelledby={`setting-${setting.id}-label`}
            />
            <span className="min-w-[3rem] text-sm font-mono text-foreground text-right">
              {setting.value}
            </span>
          </div>
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
                    ? 'bg-primary text-white border-primary shadow-lg'
                    : 'bg-panel border-border text-foreground hover:bg-panel/80 hover:border-primary/50'
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-panel/30 rounded-lg border border-border/50 hover:bg-panel/50 transition-colors duration-200">
      <div className="flex-1">
        <label 
          id={`setting-${setting.id}-label`}
          className="block font-medium text-foreground mb-1"
        >
          {setting.name}
        </label>
        <p className="text-xs text-muted">{setting.description}</p>
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
    <div className="flex items-center justify-between p-4 bg-panel/80 border-t border-border">
      <div className="flex items-center gap-2 text-xs text-muted">
        <FontAwesomeIcon icon={faInfoCircle} />
        <span>Changes are saved automatically</span>
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
  onPresetChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['display', 'gameplay']));
  const [hasChanges, setHasChanges] = useState(false);

  // Mock settings data - in a real app, this would come from props or context
  const categories: SettingCategory[] = useMemo(() => [
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
        },
        {
          id: 'game-speed',
          name: 'Game Speed',
          description: 'Base game simulation speed',
          type: 'range',
          value: 1,
          min: 0.5,
          max: 3,
          step: 0.1,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] bg-panel border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-panel/80 border-b border-border">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCog} className="text-primary text-xl" />
            <div>
              <h2 className="text-xl font-bold text-foreground">Game Settings</h2>
              <p className="text-sm text-muted">Customize your gaming experience</p>
            </div>
          </div>
          <ActionButton
            onClick={onClose}
            variant="secondary"
            className="p-2 hover:bg-danger/10 hover:text-danger transition-colors duration-200"
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