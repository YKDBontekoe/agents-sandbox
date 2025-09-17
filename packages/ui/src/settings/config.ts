import type { SettingCategory } from './types';
export type { SettingCategory } from './types';
export type {
  CategoryBuilderContext,
  LayoutPreset,
  NumericSettingConfig,
  NumericChangeHandler,
  PresetSettingItem,
  RangeSettingItem,
  SelectChangeHandler,
  SelectOption,
  SelectSettingItem,
  SettingItem,
  SettingType,
  SettingValue,
  ToggleChangeHandler,
  ToggleSettingConfig,
  ToggleSettingItem,
  NumberSettingItem,
} from './types';
export {
  isNumberSetting,
  isPresetSetting,
  isRangeSetting,
  isSelectSetting,
  isToggleSetting,
} from './types';

import { buildAccessibilityCategory } from './categories/accessibilityCategory';
import { buildAudioCategory } from './categories/audioCategory';
import { buildDisplayCategory } from './categories/displayCategory';
import type { DisplayCategoryOptions } from './categories/displayCategory';
import { buildGameplayCategory } from './categories/gameplayCategory';
import { buildInboxCategory } from './categories/inboxCategory';
import { buildWorldCategory } from './categories/worldCategory';
import type { WorldCategoryOptions } from './categories/worldCategory';
import type { CategoryBuilderContext } from './types';

export type { DisplayCategoryOptions, WorldCategoryOptions };

export interface SettingsComposerOptions {
  onAnyChange: () => void;
  display?: DisplayCategoryOptions;
  world?: WorldCategoryOptions;
  includeInbox?: boolean;
  includeGameplay?: boolean;
  includeAudio?: boolean;
  includeAccessibility?: boolean;
}

const createContext = (onAnyChange: () => void): CategoryBuilderContext => ({
  onAnyChange,
});

export const createSettingsConfig = ({
  onAnyChange,
  display,
  world,
  includeInbox = true,
  includeGameplay = true,
  includeAudio = true,
  includeAccessibility = true,
}: SettingsComposerOptions): SettingCategory[] => {
  const categories: SettingCategory[] = [];
  const context = createContext(onAnyChange);

  if (includeInbox) {
    categories.push(buildInboxCategory());
  }

  const worldCategory = buildWorldCategory(world, context);
  if (worldCategory) {
    categories.push(worldCategory);
  }

  if (display) {
    categories.push(buildDisplayCategory(display, context));
  }

  if (includeGameplay) {
    categories.push(buildGameplayCategory(context));
  }

  if (includeAudio) {
    categories.push(buildAudioCategory(context));
  }

  if (includeAccessibility) {
    categories.push(buildAccessibilityCategory(context));
  }

  return categories;
};
