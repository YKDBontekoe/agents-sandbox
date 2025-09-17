import * as PIXI from "pixi.js";
import type { Renderer } from "pixi.js";

import { gridToWorld } from "@/lib/isometric";
import logger from "@/lib/logger";

import { createTileGraphics } from "./tileArt";
import { getLoadedTileAtlasResource, loadTileAtlasResource } from "./tileAtlas";

interface TextureCacheEntry {
  texture: PIXI.RenderTexture;
  refCount: number;
}

export interface GridTile {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  tileType: string;
  biome?: string;
  climate?: string;
  height?: number;
  temperature?: number;
  moisture?: number;
  sprite: PIXI.Sprite;
  overlay?: PIXI.Graphics;
  dispose: () => void;
  textureCacheKey: string | null;
}

const fallbackTextureCache = new Map<string, TextureCacheEntry>();
const MAX_CACHED_TEXTURES = 100;

const ANIMATED_TILE_TYPES = new Set(["water", "forest", "river"]);

const polygonCache = new Map<string, PIXI.Polygon>();

let atlasDisabledForSession = false;

type TileTextureSource = "atlas" | "fallback";

interface TileTextureLookup {
  texture: PIXI.Texture;
  cacheKey: string | null;
  source: TileTextureSource;
}

function cleanupFallbackTextureCache() {
  if (fallbackTextureCache.size <= MAX_CACHED_TEXTURES) {
    return;
  }

  const zeroRefEntries = Array.from(fallbackTextureCache.entries()).filter(([, entry]) => entry.refCount === 0);

  if (zeroRefEntries.length === 0) {
    logger.debug(
      `[TILE_TEXTURE] Fallback cleanup skipped - no zero-ref textures available. Cache size remains ${fallbackTextureCache.size}.`,
    );
    return;
  }

  for (const [key, entry] of zeroRefEntries) {
    entry.texture.destroy(true);
    fallbackTextureCache.delete(key);

    logger.debug(
      `[TILE_TEXTURE] Cleaned up unused fallback texture ${key}. Remaining cache size: ${fallbackTextureCache.size}`,
    );

    if (fallbackTextureCache.size <= MAX_CACHED_TEXTURES) {
      break;
    }
  }
}

function getPolygonCacheKey(tileWidth: number, tileHeight: number) {
  return `${tileWidth}x${tileHeight}`;
}

function getSharedDiamondHitArea(tileWidth: number, tileHeight: number): PIXI.Polygon {
  const cacheKey = getPolygonCacheKey(tileWidth, tileHeight);
  const cached = polygonCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const hx = (tileWidth / 2) * 0.95;
  const hy = (tileHeight / 2) * 0.95;
  const polygon = new PIXI.Polygon([0, -hy, hx, 0, 0, hy, -hx, 0]);
  polygonCache.set(cacheKey, polygon);
  return polygon;
}

function getTextureCacheKey(tileType: string, tileWidth: number, tileHeight: number) {
  return `${tileType}-${tileWidth}x${tileHeight}`;
}

export function releaseTileTexture(cacheKey: string | null) {
  if (!cacheKey) {
    return;
  }

  const cacheEntry = fallbackTextureCache.get(cacheKey);
  if (!cacheEntry) {
    return;
  }

  if (cacheEntry.refCount > 0) {
    cacheEntry.refCount -= 1;
  }

  logger.debug(`[TILE_TEXTURE] Released fallback texture ${cacheKey}. New refCount: ${cacheEntry.refCount}`);

  cleanupFallbackTextureCache();
}

function createFallbackTexture(
  tileType: string,
  tileWidth: number,
  tileHeight: number,
  renderer: Renderer,
): PIXI.RenderTexture {
  const tileContainer = createTileGraphics(tileType, tileWidth, tileHeight);
  const renderTexture = PIXI.RenderTexture.create({ width: tileWidth, height: tileHeight });
  renderer.render({ container: tileContainer, target: renderTexture, clear: true });
  tileContainer.destroy({ children: true });
  return renderTexture;
}

function getFallbackTileTexture(
  tileType: string,
  tileWidth: number,
  tileHeight: number,
  renderer: Renderer,
  tileKey: string,
): TileTextureLookup {
  const cacheKey = getTextureCacheKey(tileType, tileWidth, tileHeight);
  const cached = fallbackTextureCache.get(cacheKey);
  if (cached) {
    cached.refCount += 1;
    logger.debug(
      `[TILE_TEXTURE] Fallback cache hit for ${tileKey} using key ${cacheKey}. RefCount now ${cached.refCount}`,
    );
    return { texture: cached.texture, cacheKey, source: "fallback" };
  }

  const startTime = performance.now();
  const renderTexture = createFallbackTexture(tileType, tileWidth, tileHeight, renderer);

  fallbackTextureCache.set(cacheKey, { texture: renderTexture, refCount: 1 });
  cleanupFallbackTextureCache();

  const createTime = performance.now() - startTime;
  logger.debug(
    `[TILE_TEXTURE] Generated fallback texture for ${tileKey} (type: ${tileType}) in ${createTime.toFixed(2)}ms`,
  );

  return { texture: renderTexture, cacheKey, source: "fallback" };
}

function getAtlasTexture(
  tileType: string,
  tileWidth: number,
  tileHeight: number,
  tileKey: string,
): TileTextureLookup | null {
  const atlas = getLoadedTileAtlasResource(tileWidth, tileHeight);
  if (!atlas) {
    return null;
  }

  const atlasTexture = atlas.textures[tileType] ?? atlas.textures.unknown;
  if (!atlasTexture) {
    logger.error(`[TILE_ATLAS] Missing texture for tile type ${tileType} (${tileKey}) in atlas`);
    return null;
  }

  logger.debug(`[TILE_TEXTURE] Atlas hit for ${tileKey} using type ${tileType}`);
  return { texture: atlasTexture, cacheKey: null, source: "atlas" };
}

export async function ensureTileAtlas(
  renderer: Renderer | null | undefined,
  tileWidth: number,
  tileHeight: number,
): Promise<void> {
  if (!renderer) {
    throw new Error("Renderer is required to load tile atlas");
  }

  if (atlasDisabledForSession) {
    return;
  }

  try {
    await loadTileAtlasResource({ renderer, tileWidth, tileHeight });
  } catch (error) {
    atlasDisabledForSession = true;
    logger.error(`[TILE_ATLAS] Failed to load atlas ${tileWidth}x${tileHeight}`, error);
    if (process.env.NODE_ENV !== "production") {
      logger.warn(`[TILE_ATLAS] Falling back to runtime tile texture generation for development builds.`);
    } else {
      throw error;
    }
  }
}

export function getTileTexture(
  tileType: string,
  tileWidth: number,
  tileHeight: number,
  renderer: Renderer,
  tileKey: string,
): TileTextureLookup {
  if (!renderer) {
    throw new Error(`Renderer is required to fetch tile textures. Missing for tile ${tileKey}`);
  }

  if (!atlasDisabledForSession) {
    const atlasTexture = getAtlasTexture(tileType, tileWidth, tileHeight, tileKey);
    if (atlasTexture) {
      return atlasTexture;
    }
  }

  if (atlasDisabledForSession || process.env.NODE_ENV !== "production") {
    return getFallbackTileTexture(tileType, tileWidth, tileHeight, renderer, tileKey);
  }

  throw new Error(
    `[TILE_TEXTURE] Tile atlas not ready for ${tileKey} (${tileType}). ensureTileAtlas must be called before sprite creation.`,
  );
}

export function createTileSprite(
  gridX: number,
  gridY: number,
  gridContainer: PIXI.Container,
  tileWidth: number,
  tileHeight: number,
  tileTypes: string[][],
  renderer: Renderer,
  options?: { tileTypeOverride?: string },
): GridTile {
  const startTime = performance.now();
  const tileKey = `${gridX},${gridY}`;

  logger.debug(`[TILE_CREATE] Starting creation of tile ${tileKey}`);

  const { worldX, worldY } = gridToWorld(gridX, gridY, tileWidth, tileHeight);
  const tileType = options?.tileTypeOverride ?? (tileTypes[gridY]?.[gridX] || "unknown");

  logger.debug(`[TILE_CREATE] Creating tile ${tileKey} (${tileType}) at world position (${worldX}, ${worldY})`);
  if (!renderer) {
    throw new Error(`Renderer is required to create tile sprites. Missing for tile ${tileKey}`);
  }

  const textureLookup = getTileTexture(tileType, tileWidth, tileHeight, renderer, tileKey);
  const sprite = new PIXI.Sprite(textureLookup.texture);
  sprite.anchor.set(0.5, 0.5);
  sprite.position.set(worldX, worldY);
  sprite.zIndex = 2;
  (sprite as unknown as { eventMode: string }).eventMode = "static";
  sprite.hitArea = getSharedDiamondHitArea(tileWidth, tileHeight);
  sprite.cursor = "pointer";

  logger.debug(`[TILE_GRAPHICS] Created sprite for ${tileKey} using ${textureLookup.source} texture`);

  let overlay: PIXI.Graphics | undefined;
  if (ANIMATED_TILE_TYPES.has(tileType)) {
    overlay = new PIXI.Graphics();
    overlay.zIndex = 5;
    (overlay as unknown as { eventMode: string }).eventMode = "none";
    overlay.position.set(worldX, worldY);
    gridContainer.addChild(overlay);
    logger.debug(`[TILE_GRAPHICS] Added overlay graphics to grid container for ${tileKey}`);
  } else {
    logger.debug(`[TILE_GRAPHICS] Skipping overlay allocation for ${tileKey} (${tileType})`);
  }

  const createTime = performance.now() - startTime;
  logger.info(
    `[TILE_CREATE] Created tile ${tileKey} (${tileType}) in ${createTime.toFixed(2)}ms. Sprite ID: ${sprite.uid}`,
  );

  const gridTile: GridTile = {
    x: gridX,
    y: gridY,
    worldX,
    worldY,
    tileType,
    sprite,
    overlay,
    dispose: () => {},
    textureCacheKey: textureLookup.cacheKey,
  };

  let disposed = false;
  const dispose = () => {
    if (disposed) {
      logger.debug(`[TILE_DISPOSE] Tile ${tileKey} already disposed`);
      return;
    }
    disposed = true;

    const disposeStartTime = performance.now();
    logger.debug(`[TILE_DISPOSE] Starting disposal of tile ${tileKey}. Sprite destroyed: ${sprite.destroyed}`);

    let disposedObjects = 0;

    try {
      if (overlay && !overlay.destroyed) {
        if (overlay.parent) {
          overlay.parent.removeChild(overlay);
        }
        overlay.destroy({ children: true, texture: true });
        disposedObjects++;
        logger.debug(`[TILE_DISPOSE] Destroyed overlay graphics for tile ${tileKey}`);
      }
    } catch (error) {
      logger.error(`[TILE_DISPOSE] Error destroying overlay graphics for tile ${tileKey}:`, error);
    }

    try {
      if (sprite.parent) {
        const parent = sprite.parent;
        const parentChildrenBefore = parent.children.length;
        parent.removeChild(sprite);
        logger.debug(
          `[TILE_DISPOSE] Removed tile ${tileKey} from parent. Parent children: ${parentChildrenBefore} -> ${parent.children.length}`,
        );
      }

      if (!sprite.destroyed) {
        sprite.hitArea = null;
        sprite.destroy({ children: true });
        disposedObjects++;
        logger.debug(`[TILE_DISPOSE] Destroyed main sprite for tile ${tileKey}`);
      }
    } catch (error) {
      logger.error(`[TILE_DISPOSE] Error destroying main sprite for tile ${tileKey}:`, error);
    }

    releaseTileTexture(gridTile.textureCacheKey);
    gridTile.textureCacheKey = null;

    const disposeTime = performance.now() - disposeStartTime;
    logger.info(
      `[TILE_DISPOSE] Disposed tile ${tileKey} in ${disposeTime.toFixed(2)}ms. Objects disposed: ${disposedObjects}`,
    );
  };

  gridTile.dispose = dispose;

  return gridTile;
}
