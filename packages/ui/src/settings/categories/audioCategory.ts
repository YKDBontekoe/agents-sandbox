import { faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import type { CategoryBuilderContext, SettingCategory } from '../types';

export const buildAudioCategory = (
  context: CategoryBuilderContext,
): SettingCategory => ({
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
      onChange: () => context.onAnyChange(),
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
      onChange: () => context.onAnyChange(),
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
      onChange: () => context.onAnyChange(),
    },
    {
      id: 'mute-background',
      name: 'Mute When Inactive',
      description: 'Mute audio when game is not focused',
      type: 'toggle',
      value: true,
      onChange: () => context.onAnyChange(),
    },
  ],
});
