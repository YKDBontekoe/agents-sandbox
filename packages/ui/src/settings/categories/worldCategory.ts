import { faGamepad } from '@fortawesome/free-solid-svg-icons';
import type {
  CategoryBuilderContext,
  NumericSettingConfig,
  SettingCategory,
  SettingItem,
  ToggleSettingConfig,
} from '../types';
import { createNumericHandler, createToggleHandler } from '../utils';

export interface WorldCategoryOptions {
  showRoads?: ToggleSettingConfig;
  showCitizens?: ToggleSettingConfig;
  autoAssignWorkers?: ToggleSettingConfig;
  edgeScrollEnabled?: ToggleSettingConfig;
  requireRoadConfirm?: ToggleSettingConfig;
  citizensCount?: NumericSettingConfig;
  citizensSeed?: NumericSettingConfig;
}

const pushToggleSetting = (
  settings: SettingItem[],
  context: CategoryBuilderContext,
  id: string,
  name: string,
  description: string,
  config?: ToggleSettingConfig,
) => {
  if (!config) return;

  settings.push({
    id,
    name,
    description,
    type: 'toggle',
    value: Boolean(config.value),
    onChange: createToggleHandler(config.onChange, context.onAnyChange),
  });
};

const pushNumericSetting = (
  settings: SettingItem[],
  context: CategoryBuilderContext,
  id: string,
  name: string,
  description: string,
  config?: NumericSettingConfig,
  extra?: { min: number; max: number; step?: number },
) => {
  if (!config) return;

  const value = Number.isFinite(config.value) ? config.value : extra?.min ?? 0;
  const onChange = createNumericHandler(config.onChange, context.onAnyChange);

  if (extra) {
    settings.push({
      id,
      name,
      description,
      type: 'range',
      value,
      min: extra.min,
      max: extra.max,
      step: extra.step,
      onChange,
    });
    return;
  }

  settings.push({
    id,
    name,
    description,
    type: 'number',
    value,
    onChange,
  });
};

export const buildWorldCategory = (
  options: WorldCategoryOptions | undefined,
  context: CategoryBuilderContext,
): SettingCategory | null => {
  if (!options) {
    return null;
  }

  const settings: SettingItem[] = [];

  pushToggleSetting(
    settings,
    context,
    'show-roads',
    'Show Roads',
    'Toggle road overlays on the map',
    options.showRoads,
  );

  pushToggleSetting(
    settings,
    context,
    'show-citizens',
    'Show Citizens',
    'Toggle citizen activity markers',
    options.showCitizens,
  );

  pushToggleSetting(
    settings,
    context,
    'auto-assign-workers',
    'Auto-Assign Workers',
    'Automatically assign idle workers to best available jobs',
    options.autoAssignWorkers,
  );

  pushToggleSetting(
    settings,
    context,
    'edge-scroll',
    'Edge Scroll Panning',
    'Pan camera when cursor nears screen edge',
    options.edgeScrollEnabled,
  );

  pushToggleSetting(
    settings,
    context,
    'confirm-roads',
    'Confirm Roads Before Building',
    'Ask for approval when citizens propose roads',
    options.requireRoadConfirm,
  );

  pushNumericSetting(
    settings,
    context,
    'citizens-count',
    'Citizens Count',
    'Number of active citizens (applies immediately)',
    options.citizensCount,
    { min: 2, max: 20, step: 1 },
  );

  pushNumericSetting(
    settings,
    context,
    'citizens-seed',
    'Citizens Seed',
    'Randomization seed for citizens (movement variance)',
    options.citizensSeed,
  );

  if (settings.length === 0) {
    return null;
  }

  return {
    id: 'world',
    name: 'World',
    icon: faGamepad,
    description: 'Map, citizens, and building preferences',
    settings,
  };
};
