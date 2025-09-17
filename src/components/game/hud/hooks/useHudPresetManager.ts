import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  HUDLayoutPreset,
  HUDLayoutPresetId,
} from '../presets/types';

const DEFAULT_STORAGE_KEYS = {
  customPresets: 'hud-custom-presets',
  currentPreset: 'hud-current-preset',
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const memoryStorage = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key) ?? null : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  } satisfies StorageLike;
})();

function resolveStorage(storage?: StorageLike): StorageLike {
  if (storage) {
    return storage;
  }

  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage;
  }

  return memoryStorage;
}

function parseStoredPresets(raw: string | null): HUDLayoutPreset[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HUDLayoutPreset[];
  } catch {
    return [];
  }
}

function createCustomPresetId(baseId: HUDLayoutPresetId) {
  return `${baseId}-custom-${Date.now().toString(36)}`;
}

function mergePreset(base: HUDLayoutPreset, updates: Partial<HUDLayoutPreset>): HUDLayoutPreset {
  return {
    ...base,
    ...updates,
  };
}

export interface HudPresetManagerOptions {
  basePresets: HUDLayoutPreset[];
  defaultPresetId?: HUDLayoutPresetId;
  storage?: StorageLike;
  storageKeys?: Partial<typeof DEFAULT_STORAGE_KEYS>;
}

export interface HudPresetManager {
  basePresets: HUDLayoutPreset[];
  customPresets: HUDLayoutPreset[];
  availablePresets: HUDLayoutPreset[];
  currentPreset: HUDLayoutPreset;
  currentPresetId: HUDLayoutPresetId;
  setPreset: (presetId: HUDLayoutPresetId) => void;
  customizePreset: (presetId: HUDLayoutPresetId, updates: Partial<HUDLayoutPreset>) => HUDLayoutPresetId | null;
  resetPreset: (presetId: HUDLayoutPresetId) => void;
  createCustomPreset: (preset: HUDLayoutPreset) => void;
  deleteCustomPreset: (presetId: HUDLayoutPresetId) => void;
  getPresetById: (presetId: HUDLayoutPresetId) => HUDLayoutPreset | undefined;
  isCustomPreset: (presetId: HUDLayoutPresetId) => boolean;
}

export function useHudPresetManager({
  basePresets,
  defaultPresetId,
  storage,
  storageKeys,
}: HudPresetManagerOptions): HudPresetManager {
  const resolvedStorage = useMemo(() => resolveStorage(storage), [storage]);
  const keys = useMemo(() => ({
    customPresets: storageKeys?.customPresets ?? DEFAULT_STORAGE_KEYS.customPresets,
    currentPreset: storageKeys?.currentPreset ?? DEFAULT_STORAGE_KEYS.currentPreset,
  }), [storageKeys?.customPresets, storageKeys?.currentPreset]);

  const [customPresets, setCustomPresets] = useState<HUDLayoutPreset[]>(() =>
    parseStoredPresets(resolvedStorage.getItem(keys.customPresets))
  );

  const initialPresetId = useMemo(() => {
    const storedId = resolvedStorage.getItem(keys.currentPreset);
    if (storedId) {
      return storedId as HUDLayoutPresetId;
    }
    if (defaultPresetId) {
      return defaultPresetId;
    }
    return basePresets[0]?.id ?? 'default';
  }, [basePresets, defaultPresetId, keys.currentPreset, resolvedStorage]);

  const [currentPresetId, setCurrentPresetId] = useState<HUDLayoutPresetId>(initialPresetId);

  useEffect(() => {
    const availableIds = new Set([
      ...basePresets.map(preset => preset.id),
      ...customPresets.map(preset => preset.id),
    ]);

    if (!availableIds.has(currentPresetId)) {
      const fallbackId =
        (defaultPresetId && availableIds.has(defaultPresetId) && defaultPresetId) ||
        basePresets[0]?.id ||
        customPresets[0]?.id;

      if (fallbackId && fallbackId !== currentPresetId) {
        setCurrentPresetId(fallbackId);
      }
    }
  }, [basePresets, customPresets, currentPresetId, defaultPresetId]);

  useEffect(() => {
    try {
      resolvedStorage.setItem(keys.customPresets, JSON.stringify(customPresets));
    } catch (error) {
      console.warn('Failed to persist HUD custom presets', error);
    }
  }, [customPresets, keys.customPresets, resolvedStorage]);

  useEffect(() => {
    try {
      resolvedStorage.setItem(keys.currentPreset, currentPresetId);
    } catch (error) {
      console.warn('Failed to persist HUD current preset', error);
    }
  }, [currentPresetId, keys.currentPreset, resolvedStorage]);

  const basePresetMap = useMemo(() => new Map(basePresets.map(preset => [preset.id, preset])), [basePresets]);
  const customPresetMap = useMemo(
    () => new Map(customPresets.map(preset => [preset.id, preset])),
    [customPresets]
  );

  const availablePresets = useMemo(
    () => [...basePresets, ...customPresets],
    [basePresets, customPresets]
  );

  const availablePresetMap = useMemo(
    () => new Map(availablePresets.map(preset => [preset.id, preset])),
    [availablePresets]
  );

  const currentPreset = useMemo(() => {
    return (
      availablePresetMap.get(currentPresetId) ||
      availablePresets[0] ||
      basePresets[0]
    );
  }, [availablePresetMap, availablePresets, basePresets, currentPresetId]);

  const setPreset = useCallback(
    (presetId: HUDLayoutPresetId) => {
      if (!availablePresetMap.has(presetId)) {
        return;
      }
      setCurrentPresetId(presetId);
    },
    [availablePresetMap]
  );

  const customizePreset = useCallback(
    (presetId: HUDLayoutPresetId, updates: Partial<HUDLayoutPreset>) => {
      const targetPreset = availablePresetMap.get(presetId);
      if (!targetPreset) {
        return null;
      }

      const mergedPreset = mergePreset(targetPreset, updates);

      if (basePresetMap.has(presetId)) {
        const id = createCustomPresetId(presetId);
        const customPreset: HUDLayoutPreset = {
          ...mergedPreset,
          id,
          name: updates.name ?? `${targetPreset.name} (Custom)`,
        };

        setCustomPresets(prev => [...prev, customPreset]);
        setCurrentPresetId(id);
        return id;
      }

      setCustomPresets(prev =>
        prev.map(preset => (preset.id === presetId ? { ...preset, ...mergedPreset } : preset))
      );
      return presetId;
    },
    [availablePresetMap, basePresetMap]
  );

  const resetPreset = useCallback(
    (presetId: HUDLayoutPresetId) => {
      if (!basePresetMap.has(presetId)) {
        return;
      }

      setCustomPresets(prev => prev.filter(preset => !preset.id.startsWith(`${presetId}-custom`)));
      setCurrentPresetId(presetId);
    },
    [basePresetMap]
  );

  const createCustomPreset = useCallback((preset: HUDLayoutPreset) => {
    setCustomPresets(prev => {
      const existingIndex = prev.findIndex(item => item.id === preset.id);
      if (existingIndex === -1) {
        return [...prev, preset];
      }

      const next = [...prev];
      next[existingIndex] = preset;
      return next;
    });
  }, []);

  const deleteCustomPreset = useCallback(
    (presetId: HUDLayoutPresetId) => {
      setCustomPresets(prev => prev.filter(preset => preset.id !== presetId));
      if (currentPresetId === presetId) {
        const fallbackId = basePresets[0]?.id ?? defaultPresetId ?? availablePresets[0]?.id;
        if (fallbackId) {
          setCurrentPresetId(fallbackId);
        }
      }
    },
    [availablePresets, basePresets, currentPresetId, defaultPresetId]
  );

  const getPresetById = useCallback(
    (presetId: HUDLayoutPresetId) => availablePresetMap.get(presetId),
    [availablePresetMap]
  );

  const isCustomPreset = useCallback(
    (presetId: HUDLayoutPresetId) => customPresetMap.has(presetId),
    [customPresetMap]
  );

  return useMemo(
    () => ({
      basePresets,
      customPresets,
      availablePresets,
      currentPreset,
      currentPresetId,
      setPreset,
      customizePreset,
      resetPreset,
      createCustomPreset,
      deleteCustomPreset,
      getPresetById,
      isCustomPreset,
    }),
    [
      availablePresets,
      basePresets,
      createCustomPreset,
      currentPreset,
      currentPresetId,
      customizePreset,
      deleteCustomPreset,
      getPresetById,
      isCustomPreset,
      resetPreset,
      setPreset,
      customPresets,
    ]
  );
}

export function createInMemoryPresetStorage(initial: Record<string, string> = {}): StorageLike {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key) ?? null : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}
