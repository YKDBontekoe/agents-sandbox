import { faGamepad } from '@fortawesome/free-solid-svg-icons';
import type { CategoryBuilderContext, SettingCategory } from '../types';

export const buildGameplayCategory = (
  context: CategoryBuilderContext,
): SettingCategory => ({
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
      onChange: () => context.onAnyChange(),
    },
    {
      id: 'tutorial-hints',
      name: 'Tutorial Hints',
      description: 'Show helpful tips and guidance',
      type: 'toggle',
      value: true,
      onChange: () => context.onAnyChange(),
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
      onChange: () => context.onAnyChange(),
    },
  ],
});
