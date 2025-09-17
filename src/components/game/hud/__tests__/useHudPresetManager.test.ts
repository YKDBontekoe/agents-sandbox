import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defaultHudPresets } from '../presets/defaultPresets';
import {
  createInMemoryPresetStorage,
  useHudPresetManager,
} from '../hooks/useHudPresetManager';

describe('useHudPresetManager', () => {
  it('creates and retrieves custom presets without mutating base presets', () => {
    const storage = createInMemoryPresetStorage();
    const { result } = renderHook(() =>
      useHudPresetManager({ basePresets: defaultHudPresets, storage })
    );

    const customPreset = {
      ...defaultHudPresets[0],
      id: 'custom-one',
      name: 'Custom One',
    };

    act(() => {
      result.current.createCustomPreset(customPreset);
    });

    expect(result.current.customPresets).toHaveLength(1);
    expect(result.current.getPresetById('custom-one')).toEqual(customPreset);
    expect(result.current.isCustomPreset('custom-one')).toBe(true);
    expect(result.current.availablePresets).toContainEqual(customPreset);
    expect(result.current.basePresets[0].id).toBe(defaultHudPresets[0].id);
  });

  it('customizes presets by cloning defaults and updating custom entries', () => {
    const storage = createInMemoryPresetStorage();
    const { result } = renderHook(() =>
      useHudPresetManager({ basePresets: defaultHudPresets, storage })
    );

    let customId: string | null = null;
    act(() => {
      customId = result.current.customizePreset('default', { name: 'Tailored Layout' });
    });

    expect(customId).toBeTruthy();
    expect(result.current.customPresets).toHaveLength(1);
    expect(result.current.currentPreset.id).toBe(customId);
    expect(result.current.currentPreset.name).toBe('Tailored Layout');

    act(() => {
      result.current.customizePreset(customId!, { description: 'Updated description' });
    });

    expect(result.current.customPresets).toHaveLength(1);
    expect(result.current.currentPreset.id).toBe(customId);
    expect(result.current.currentPreset.description).toBe('Updated description');
  });

  it('resets and deletes custom presets, restoring defaults safely', () => {
    const storage = createInMemoryPresetStorage();
    const { result } = renderHook(() =>
      useHudPresetManager({ basePresets: defaultHudPresets, storage })
    );

    let customId: string | null = null;
    act(() => {
      customId = result.current.customizePreset('default', { name: 'Temporary Layout' });
    });

    expect(result.current.currentPreset.id).toBe(customId);

    act(() => {
      result.current.resetPreset('default');
    });

    expect(result.current.customPresets).toHaveLength(0);
    expect(result.current.currentPreset.id).toBe('default');

    const removablePreset = {
      ...defaultHudPresets[1],
      id: 'custom-delete',
      name: 'Delete Me',
    };

    act(() => {
      result.current.createCustomPreset(removablePreset);
    });

    act(() => {
      result.current.setPreset('custom-delete');
    });

    expect(result.current.currentPreset.id).toBe('custom-delete');

    act(() => {
      result.current.deleteCustomPreset('custom-delete');
    });

    expect(result.current.isCustomPreset('custom-delete')).toBe(false);
    expect(result.current.currentPreset.id).toBe('default');
  });
});
