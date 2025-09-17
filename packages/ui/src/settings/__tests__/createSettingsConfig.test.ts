import { describe, expect, it, vi } from 'vitest';
import { createSettingsConfig } from '../config';
import type { LayoutPreset } from '../config';

const layoutPresets: LayoutPreset[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Default layout',
  },
];

describe('createSettingsConfig', () => {
  it('wraps world handlers with onAnyChange callbacks', () => {
    const onAnyChange = vi.fn();
    const onToggleRoads = vi.fn();
    const onChangeCitizensCount = vi.fn();

    const categories = createSettingsConfig({
      onAnyChange,
      display: {
        layoutPresets,
        currentPreset: 'default',
        onPresetChange: vi.fn(),
      },
      world: {
        showRoads: {
          value: true,
          onChange: onToggleRoads,
        },
        citizensCount: {
          value: 8,
          onChange: onChangeCitizensCount,
        },
      },
    });

    const worldCategory = categories.find((category) => category.id === 'world');
    expect(worldCategory).toBeDefined();

    const showRoadsSetting = worldCategory?.settings.find(
      (setting) => setting.id === 'show-roads',
    );
    expect(showRoadsSetting).toBeDefined();
    showRoadsSetting?.onChange(false);

    expect(onToggleRoads).toHaveBeenCalledWith(false);

    const citizensCountSetting = worldCategory?.settings.find(
      (setting) => setting.id === 'citizens-count',
    );
    expect(citizensCountSetting).toBeDefined();
    citizensCountSetting?.onChange(12);

    expect(onChangeCitizensCount).toHaveBeenCalledWith(12);
    expect(onAnyChange).toHaveBeenCalledTimes(2);
  });

  it('applies default display values', () => {
    const categories = createSettingsConfig({
      onAnyChange: vi.fn(),
      display: {
        layoutPresets,
        currentPreset: 'default',
        onPresetChange: vi.fn(),
      },
    });

    const displayCategory = categories.find((category) => category.id === 'display');
    expect(displayCategory).toBeDefined();

    const qualitySetting = displayCategory?.settings.find(
      (setting) => setting.id === 'quality',
    );
    expect(qualitySetting?.value).toBe('high');

    const fpsLimitSetting = displayCategory?.settings.find(
      (setting) => setting.id === 'fps-limit',
    );
    expect(fpsLimitSetting?.value).toBe(60);

    const vsyncSetting = displayCategory?.settings.find(
      (setting) => setting.id === 'vsync',
    );
    expect(vsyncSetting?.value).toBe(true);
  });

  it('omits the world category when no world options are provided', () => {
    const categories = createSettingsConfig({
      onAnyChange: vi.fn(),
      display: {
        layoutPresets,
        currentPreset: 'default',
        onPresetChange: vi.fn(),
      },
    });

    expect(categories.some((category) => category.id === 'world')).toBe(false);
  });
});
