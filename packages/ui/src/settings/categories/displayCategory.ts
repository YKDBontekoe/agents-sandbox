import { faDesktop } from '@fortawesome/free-solid-svg-icons';
import type {
  CategoryBuilderContext,
  LayoutPreset,
  SettingCategory,
} from '../types';

export interface DisplayCategoryOptions {
  layoutPresets: LayoutPreset[];
  currentPreset: string;
  onPresetChange: (presetId: string) => void;
}

export const buildDisplayCategory = (
  options: DisplayCategoryOptions,
  context: CategoryBuilderContext,
): SettingCategory => ({
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
      value: options.currentPreset,
      options: options.layoutPresets.map((preset) => ({
        value: preset.id,
        label: preset.name,
      })),
      onChange: (presetId) => {
        options.onPresetChange(presetId);
        context.onAnyChange();
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
      onChange: () => context.onAnyChange(),
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
      onChange: () => context.onAnyChange(),
    },
    {
      id: 'vsync',
      name: 'V-Sync',
      description: 'Synchronize with monitor refresh rate',
      type: 'toggle',
      value: true,
      onChange: () => context.onAnyChange(),
    },
    {
      id: 'fullscreen',
      name: 'Fullscreen Mode',
      description: 'Run game in fullscreen',
      type: 'toggle',
      value: false,
      onChange: () => context.onAnyChange(),
    },
  ],
});
