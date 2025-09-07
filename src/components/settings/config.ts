import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faGamepad,
  faDesktop,
  faVolumeUp,
  faUniversalAccess,
  faInfoCircle,
} from '@/lib/icons';

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  icon?: IconDefinition;
}

export type SettingValue = string | number | boolean;

export interface SettingItem {
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

export interface SettingCategory {
  id: string;
  name: string;
  icon: IconDefinition;
  description: string;
  settings: SettingItem[];
}

export interface SettingsConfigOptions {
  layoutPresets: LayoutPreset[];
  currentPreset: string;
  onPresetChange: (presetId: string) => void;
  onAnyChange: () => void;
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
  autoAssignWorkers?: boolean;
  onToggleAutoAssignWorkers?: (value: boolean) => void;
}

export const createSettingsConfig = (
  opts: SettingsConfigOptions,
): SettingCategory[] => [
  {
    id: 'inbox',
    name: 'Inbox',
    icon: faInfoCircle,
    description: 'Notifications & history',
    settings: [],
  },
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
        value: Boolean(opts.showRoads),
        onChange: (v: SettingValue) => {
          opts.onToggleRoads?.(Boolean(v));
          opts.onAnyChange();
        },
      },
      {
        id: 'show-citizens',
        name: 'Show Citizens',
        description: 'Toggle citizen activity markers',
        type: 'toggle',
        value: Boolean(opts.showCitizens),
        onChange: (v: SettingValue) => {
          opts.onToggleCitizens?.(Boolean(v));
          opts.onAnyChange();
        },
      },
      {
        id: 'auto-assign-workers',
        name: 'Auto-Assign Workers',
        description: 'Automatically assign idle workers to best available jobs',
        type: 'toggle',
        value: Boolean(opts.autoAssignWorkers),
        onChange: (v: SettingValue) => {
          opts.onToggleAutoAssignWorkers?.(Boolean(v));
          opts.onAnyChange();
        },
      },
      {
        id: 'edge-scroll',
        name: 'Edge Scroll Panning',
        description: 'Pan camera when cursor nears screen edge',
        type: 'toggle',
        value: Boolean(opts.edgeScrollEnabled),
        onChange: (v: SettingValue) => {
          opts.onToggleEdgeScroll?.(Boolean(v));
          opts.onAnyChange();
        },
      },
      {
        id: 'confirm-roads',
        name: 'Confirm Roads Before Building',
        description: 'Ask for approval when citizens propose roads',
        type: 'toggle',
        value: Boolean(opts.requireRoadConfirm),
        onChange: (v: SettingValue) => {
          opts.onToggleRoadConfirm?.(Boolean(v));
          opts.onAnyChange();
        },
      },
      {
        id: 'citizens-count',
        name: 'Citizens Count',
        description: 'Number of active citizens (applies immediately)',
        type: 'range',
        value: Number(opts.citizensCount ?? 8),
        min: 2,
        max: 20,
        step: 1,
        onChange: (v: SettingValue) => {
          opts.onChangeCitizensCount?.(Number(v));
          opts.onAnyChange();
        },
      },
      {
        id: 'citizens-seed',
        name: 'Citizens Seed',
        description: 'Randomization seed for citizens (movement variance)',
        type: 'number',
        value: Number(opts.citizensSeed ?? 0),
        onChange: (v: SettingValue) => {
          opts.onChangeCitizensSeed?.(Number(v));
          opts.onAnyChange();
        },
      },
    ],
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
        value: opts.currentPreset,
        options: opts.layoutPresets.map(preset => ({
          value: preset.id,
          label: preset.name,
        })),
        onChange: (value: SettingValue) => {
          opts.onPresetChange(value as string);
          opts.onAnyChange();
        },
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
          { value: 'ultra', label: 'Ultra' },
        ],
        onChange: () => opts.onAnyChange(),
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
        onChange: () => opts.onAnyChange(),
      },
      {
        id: 'vsync',
        name: 'V-Sync',
        description: 'Synchronize with monitor refresh rate',
        type: 'toggle',
        value: true,
        onChange: () => opts.onAnyChange(),
      },
      {
        id: 'fullscreen',
        name: 'Fullscreen Mode',
        description: 'Run game in fullscreen',
        type: 'toggle',
        value: false,
        onChange: () => opts.onAnyChange(),
      },
    ],
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
        onChange: () => opts.onAnyChange(),
      },
      {
        id: 'tutorial-hints',
        name: 'Tutorial Hints',
        description: 'Show helpful tips and guidance',
        type: 'toggle',
        value: true,
        onChange: () => opts.onAnyChange(),
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
          { value: 'expert', label: 'Expert' },
        ],
        onChange: () => opts.onAnyChange(),
      },
    ],
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
        onChange: () => opts.onAnyChange(),
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
        onChange: () => opts.onAnyChange(),
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
        onChange: () => opts.onAnyChange(),
      },
      {
        id: 'mute-background',
        name: 'Mute When Inactive',
        description: 'Mute audio when game is not focused',
        type: 'toggle',
        value: true,
        onChange: () => opts.onAnyChange(),
      },
    ],
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
        onChange: () => opts.onAnyChange(),
      },
      {
        id: 'large-text',
        name: 'Large Text',
        description: 'Increase text size throughout the interface',
        type: 'toggle',
        value: false,
        onChange: () => opts.onAnyChange(),
      },
      {
        id: 'reduced-motion',
        name: 'Reduce Motion',
        description: 'Minimize animations and transitions',
        type: 'toggle',
        value: false,
        onChange: () => opts.onAnyChange(),
      },
      {
        id: 'screen-reader',
        name: 'Screen Reader Support',
        description: 'Enhanced support for screen readers',
        type: 'toggle',
        value: false,
        onChange: () => opts.onAnyChange(),
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
          { value: 'tritanopia', label: 'Tritanopia' },
        ],
        onChange: () => opts.onAnyChange(),
      },
    ],
  },
];

