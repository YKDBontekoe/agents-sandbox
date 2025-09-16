import { useCallback, useEffect, useState } from 'react';
import logger from '@/lib/logger';

interface UsePlayMapOptions {
  initialMapSize?: number | null;
  onPersistMapSize?: (size: number) => Promise<void> | void;
}

export interface PlayMapController {
  tileTypes: string[][];
  gridSize: number | null;
  setGridSize: React.Dispatch<React.SetStateAction<number | null>>;
  mapSizeModalOpen: boolean;
  setMapSizeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pendingMapSize: number;
  setPendingMapSize: React.Dispatch<React.SetStateAction<number>>;
  confirmMapSize: () => Promise<void>;
  ensureCapacityAround: (x: number, y: number, margin?: number) => void;
  revealUnknownTiles: (centerX: number, centerY: number, radius?: number) => Promise<void>;
  citizensCount: number;
  setCitizensCount: React.Dispatch<React.SetStateAction<number>>;
  citizensSeed: number;
  setCitizensSeed: React.Dispatch<React.SetStateAction<number>>;
}

function clampMapSize(size: number | null | undefined): number {
  if (size == null || Number.isNaN(size)) {
    return 32;
  }
  return Math.max(8, Math.min(48, size));
}

export function usePlayMap({ initialMapSize, onPersistMapSize }: UsePlayMapOptions): PlayMapController {
  const normalizedInitialSize = initialMapSize != null ? clampMapSize(initialMapSize) : null;

  const [tileTypes, setTileTypes] = useState<string[][]>([]);
  const [gridSize, setGridSize] = useState<number | null>(() => {
    if (normalizedInitialSize != null) {
      logger.debug('Initial gridSize from initialMapSize:', normalizedInitialSize);
      return normalizedInitialSize;
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('ad_map_size');
        if (stored) {
          const parsed = clampMapSize(Number(stored));
          logger.debug('Initial gridSize from localStorage:', parsed);
          return parsed;
        }
      } catch (err) {
        logger.error('Error reading gridSize from localStorage:', err);
      }
    }

    logger.debug('Initial gridSize fallback to default: 32');
    return 32;
  });

  const [mapSizeModalOpen, setMapSizeModalOpen] = useState(true);
  const [pendingMapSize, setPendingMapSize] = useState<number>(() => {
    if (normalizedInitialSize != null) {
      return normalizedInitialSize;
    }

    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('ad_map_size');
      if (stored) {
        return clampMapSize(Number(stored));
      }
    }

    return 32;
  });

  const [citizensCount, setCitizensCount] = useState<number>(8);
  const [citizensSeed, setCitizensSeed] = useState<number>(() => Math.floor(Math.random() * 1e6));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (normalizedInitialSize != null) {
      setPendingMapSize(normalizedInitialSize);
      setMapSizeModalOpen(false);
      return;
    }

    try {
      const saved = window.localStorage.getItem('ad_map_size');
      if (saved) {
        const parsed = clampMapSize(Number(saved));
        logger.debug('usePlayMap: applying saved map size from localStorage:', parsed);
        setGridSize(parsed);
        setPendingMapSize(parsed);
        setMapSizeModalOpen(false);
      } else {
        window.localStorage.setItem('ad_map_size', String(pendingMapSize));
        setMapSizeModalOpen(false);
      }
    } catch (err) {
      logger.error('usePlayMap: failed to read map size from localStorage:', err);
      setMapSizeModalOpen(false);
    }
  }, [normalizedInitialSize, pendingMapSize]);

  useEffect(() => {
    if (gridSize == null) {
      return;
    }

    let cancelled = false;

    const loadMap = async () => {
      try {
        const url = `/api/map?size=${gridSize}`;
        logger.debug('usePlayMap: fetching map data from', url);
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to load map (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled) {
          setTileTypes(data.map ?? []);
        }
      } catch (err) {
        logger.error('usePlayMap: error loading map data:', err);
      }
    };

    void loadMap();

    return () => {
      cancelled = true;
    };
  }, [gridSize]);

  useEffect(() => {
    if (tileTypes.length > 0) {
      try {
        void fetch(`/api/debug-log?message=TILETYPES_STATE_UPDATED&length=${tileTypes.length}`);
      } catch (err) {
        logger.warn('usePlayMap: failed to send debug log for tileTypes update:', err);
      }
    } else {
      try {
        void fetch('/api/debug-log?message=TILETYPES_STILL_EMPTY');
      } catch (err) {
        logger.warn('usePlayMap: failed to send debug log for empty tileTypes:', err);
      }
    }
  }, [tileTypes]);

  const fetchChunk = useCallback(
    async (chunkX: number, chunkY: number, chunkSize: number = 16): Promise<string[][] | null> => {
      try {
        const response = await fetch(
          `/api/map/chunk?x=${chunkX}&y=${chunkY}&size=${chunkSize}&seed=${citizensSeed}`
        );
        if (!response.ok) {
          return null;
        }
        const data = await response.json();
        return data.tiles as string[][];
      } catch (error) {
        logger.warn('usePlayMap: failed to fetch chunk:', error);
        return null;
      }
    },
    [citizensSeed]
  );

  const ensureCapacityAround = useCallback((x: number, y: number, margin: number = 2) => {
    setTileTypes((prev) => {
      const rows = prev.length;
      const cols = rows > 0 ? prev[0].length : 0;
      const needRows = Math.max(rows, y + 1 + margin);
      const needCols = Math.max(cols, x + 1 + margin);
      if (needRows === rows && needCols === cols) return prev;
      const next: string[][] = new Array(needRows);
      for (let r = 0; r < needRows; r++) {
        next[r] = new Array(needCols);
        for (let c = 0; c < needCols; c++) {
          const val = r < rows && c < (prev[r]?.length ?? 0) ? prev[r][c] : 'unknown';
          next[r][c] = val || 'unknown';
        }
      }
      return next;
    });
  }, []);

  const revealUnknownTiles = useCallback(
    async (centerX: number, centerY: number, radius: number = 8) => {
      const chunkSize = 16;
      const chunksToFetch = new Set<string>();

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const tx = centerX + dx;
          const ty = centerY + dy;
          if (tx < 0 || ty < 0) continue;

          const chunkX = Math.floor(tx / chunkSize);
          const chunkY = Math.floor(ty / chunkSize);
          chunksToFetch.add(`${chunkX},${chunkY}`);
        }
      }

      for (const chunkKey of chunksToFetch) {
        const [chunkX, chunkY] = chunkKey.split(',').map(Number);
        const chunkData = await fetchChunk(chunkX, chunkY, chunkSize);
        if (!chunkData) continue;

        setTileTypes((prev) => {
          const next = prev.map((row) => [...row]);
          const startX = chunkX * chunkSize;
          const startY = chunkY * chunkSize;

          for (let cy = 0; cy < chunkData.length; cy++) {
            for (let cx = 0; cx < chunkData[cy].length; cx++) {
              const worldX = startX + cx;
              const worldY = startY + cy;

              if (worldY >= 0 && worldY < next.length && worldX >= 0 && worldX < next[worldY].length) {
                if (next[worldY][worldX] === 'unknown') {
                  next[worldY][worldX] = chunkData[cy][cx];
                }
              }
            }
          }

          return next;
        });
      }
    },
    [fetchChunk]
  );

  const confirmMapSize = useCallback(async () => {
    const normalized = clampMapSize(Number(pendingMapSize));
    setGridSize(normalized);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('ad_map_size', String(normalized));
      }
    } catch (err) {
      logger.warn('usePlayMap: failed to store map size:', err);
    }

    setMapSizeModalOpen(false);

    if (onPersistMapSize) {
      await onPersistMapSize(normalized);
    }
  }, [pendingMapSize, onPersistMapSize]);

  return {
    tileTypes,
    gridSize,
    setGridSize,
    mapSizeModalOpen,
    setMapSizeModalOpen,
    pendingMapSize,
    setPendingMapSize,
    confirmMapSize,
    ensureCapacityAround,
    revealUnknownTiles,
    citizensCount,
    setCitizensCount,
    citizensSeed,
    setCitizensSeed,
  };
}
