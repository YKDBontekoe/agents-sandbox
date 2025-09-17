import { faUniversalAccess } from '@fortawesome/free-solid-svg-icons';
import type { CategoryBuilderContext, SettingCategory } from '../types';

export const buildAccessibilityCategory = (
  context: CategoryBuilderContext,
): SettingCategory => ({
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
      onChange: () => context.onAnyChange(),
    },
    {
      id: 'large-text',
      name: 'Large Text',
      description: 'Increase text size throughout the interface',
      type: 'toggle',
      value: false,
      onChange: () => context.onAnyChange(),
    },
    {
      id: 'reduced-motion',
      name: 'Reduce Motion',
      description: 'Minimize animations and transitions',
      type: 'toggle',
      value: false,
      onChange: () => context.onAnyChange(),
    },
    {
      id: 'screen-reader',
      name: 'Screen Reader Support',
      description: 'Enhanced support for screen readers',
      type: 'toggle',
      value: false,
      onChange: () => context.onAnyChange(),
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
      onChange: () => context.onAnyChange(),
    },
  ],
});
