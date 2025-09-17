"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as PIXI from "pixi.js";
import type { Viewport } from "pixi-viewport";

import logger from "@/lib/logger";

import { TileOverlay } from "./TileOverlay";
import { createTileSprite, getTileTexture, releaseTileTexture, type GridTile } from "./TileRenderer";

export type VisibilityUpdateOptions = {
  overlayUpdate?: boolean;
  animationTime?: number;
};

interface UpdateTileSpriteParams {
  gridTile: GridTile;
  nextType: string;
  tileWidth: number;
  tileHeight: number;
  renderer: PIXI.Renderer | null | undefined;
}

export function updateGridTileTexture({
  gridTile,
  nextType,
  tileWidth,
  tileHeight,
  renderer,
}: UpdateTileSpriteParams): boolean {
  if (!renderer) {
    logger.warn(
      `[TILE_UPDATE] Renderer unavailable when attempting to update tile ${gridTile.x},${gridTile.y}`,
    );
    return false;
  }

  if (gridTile.sprite.destroyed) {
    logger.warn(
      `[TILE_UPDATE] Attempted to update destroyed tile ${gridTile.x},${gridTile.y}`,
    );
    return false;
  }

  const tileKey = `${gridTile.x},${gridTile.y}`;
  const previousType = gridTile.tileType;
  const previousTextureKey = gridTile.textureCacheKey;
  const nextTextureKey = `${nextType}-${tileWidth}x${tileHeight}`;

  const nextTexture = getTileTexture(nextType, tileWidth, tileHeight, renderer, tileKey);

  if (gridTile.sprite.texture !== nextTexture) {
    gridTile.sprite.texture = nextTexture;
    gridTile.sprite.texture.updateUvs();
  }

  gridTile.textureCacheKey = nextTextureKey;
  gridTile.tileType = nextType;

  if (previousTextureKey && previousTextureKey !== nextTextureKey) {
    releaseTileTexture(previousTextureKey);
  }

  if (gridTile.overlay && gridTile.overlay.destroyed) {
    logger.warn(
      `[TILE_UPDATE] Overlay for tile ${tileKey} was destroyed prior to update and cannot be reused.`,
    );
  }

  logger.debug(`[TILE_UPDATE] Updated tile ${tileKey} type from ${previousType} to ${nextType}`);

  return previousType !== nextType;
}

interface UseIsometricGridSetupParams {
  app: PIXI.Application | null | undefined;
  viewport: Viewport | null | undefined;
  gridSize: number;
  tileWidth: number;
  tileHeight: number;
  tileTypes: string[][];
  onTileHover?: (x: number, y: number, tileType?: string) => void;
  onTileClick?: (x: number, y: number, tileType?: string) => void;
  requestOverlayUpdate: (options?: VisibilityUpdateOptions) => void;
}

interface UseIsometricGridSetupResult {
  gridContainerRef: MutableRefObject<PIXI.Container | null>;
  tilesRef: MutableRefObject<Map<string, GridTile>>;
  overlayManagerRef: MutableRefObject<TileOverlay | null>;
}

export function useIsometricGridSetup({
  app,
  viewport,
  gridSize,
  tileWidth,
  tileHeight,
  tileTypes,
  onTileHover,
  onTileClick,
  requestOverlayUpdate,
}: UseIsometricGridSetupParams): UseIsometricGridSetupResult {
  const gridContainerRef = useRef<PIXI.Container | null>(null);
  const tilesRef = useRef<Map<string, GridTile>>(new Map());
  const overlayManagerRef = useRef<TileOverlay | null>(null);
  const initializedRef = useRef(false);

  const tileTypesRef = useRef<string[][]>(tileTypes);
  const onTileHoverRef = useRef<typeof onTileHover>(onTileHover);
  const onTileClickRef = useRef<typeof onTileClick>(onTileClick);
  const requestOverlayUpdateRef = useRef(requestOverlayUpdate);

  useEffect(() => {
    tileTypesRef.current = tileTypes;
  }, [tileTypes]);

  useEffect(() => {
    onTileHoverRef.current = onTileHover;
  }, [onTileHover]);

  useEffect(() => {
    onTileClickRef.current = onTileClick;
  }, [onTileClick]);

  useEffect(() => {
    requestOverlayUpdateRef.current = requestOverlayUpdate;
  }, [requestOverlayUpdate]);

  const updateTileSprite = useCallback(
    (gridTile: GridTile, nextType: string) => {
      return updateGridTileTexture({
        gridTile,
        nextType,
        tileWidth,
        tileHeight,
        renderer: app?.renderer,
      });
    },
    [app, tileHeight, tileWidth],
  );

  useEffect(() => {
    if (!viewport) {
      logger.warn("useIsometricGridSetup: No viewport available");
      return;
    }

    if (!app?.renderer) {
      logger.warn("useIsometricGridSetup: No renderer available");
      return;
    }

    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    const gridContainer = new PIXI.Container();
    gridContainer.name = "isometric-grid";
    gridContainer.sortableChildren = true;
    gridContainer.zIndex = 100;
    (gridContainer as unknown as { eventMode: string }).eventMode = "static";

    viewport.addChild(gridContainer);
    gridContainerRef.current = gridContainer;

    const tiles = new Map<string, GridTile>();
    const initialTileTypes = tileTypesRef.current;

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const tile = createTileSprite(
          x,
          y,
          gridContainer,
          tileWidth,
          tileHeight,
          initialTileTypes,
          app.renderer,
        );
        const key = `${x},${y}`;
        tiles.set(key, tile);
        gridContainer.addChild(tile.sprite);
      }
    }

    logger.debug(`Created ${tiles.size} tiles for ${gridSize}x${gridSize} grid`);
    logger.debug("Grid container children count:", gridContainer.children.length);
    tilesRef.current = tiles;

    overlayManagerRef.current = new TileOverlay(gridContainer, {
      tileWidth,
      tileHeight,
      getTileType: (x, y) => tileTypesRef.current[y]?.[x],
      onTileHover: (x, y, tileType) => {
        onTileHoverRef.current?.(x, y, tileType);
      },
      onTileClick: (x, y, tileType) => {
        onTileClickRef.current?.(x, y, tileType);
      },
    });

    return () => {
      overlayManagerRef.current?.destroy();
      overlayManagerRef.current = null;
      if (gridContainer.parent) {
        gridContainer.parent.removeChild(gridContainer);
      }
      gridContainer.destroy({ children: true });
      tilesRef.current.clear();
      gridContainerRef.current = null;
      initializedRef.current = false;
    };
  }, [viewport, app, gridSize, tileWidth, tileHeight]);

  useEffect(() => {
    const gridContainer = gridContainerRef.current;
    if (!gridContainer || !app?.renderer) return;

    const tiles = tilesRef.current;
    let added = 0;

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const key = `${x},${y}`;
        if (!tiles.has(key)) {
          const tile = createTileSprite(
            x,
            y,
            gridContainer,
            tileWidth,
            tileHeight,
            tileTypes,
            app.renderer,
          );
          tiles.set(key, tile);
          gridContainer.addChild(tile.sprite);
          added++;
        }
      }
    }

    if (added > 0) {
      logger.debug(`useIsometricGridSetup: added ${added} tiles after gridSize changed to ${gridSize}`);
      requestOverlayUpdateRef.current({ overlayUpdate: true });
    }
  }, [app, gridSize, tileHeight, tileTypes, tileWidth]);

  useEffect(() => {
    const gridContainer = gridContainerRef.current;
    if (!gridContainer || !app?.renderer) return;

    const tiles = tilesRef.current;
    let updates = 0;

    tiles.forEach((gridTile) => {
      const rawType = tileTypes[gridTile.y]?.[gridTile.x];
      const nextType = rawType ?? "unknown";
      if (nextType !== gridTile.tileType) {
        updateTileSprite(gridTile, nextType);
        updates++;
      }
    });

    if (updates > 0) {
      logger.debug(`useIsometricGridSetup: updated ${updates} tiles due to tileTypes change`);
      requestOverlayUpdateRef.current({ overlayUpdate: true });
    }
  }, [app, tileTypes, tileHeight, tileWidth, updateTileSprite]);

  return useMemo(
    () => ({
      gridContainerRef,
      tilesRef,
      overlayManagerRef,
    }),
    [],
  );
}

export type { UseIsometricGridSetupResult };
