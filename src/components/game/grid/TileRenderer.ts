import * as PIXI from "pixi.js";
import type { Renderer } from "pixi.js";
import { gridToWorld, TILE_COLORS } from "@/lib/isometric";
import logger from "@/lib/logger";

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
  dispose: () => void; // Add cleanup method
}

// Texture cache to prevent memory leaks
const textureCache = new Map<string, PIXI.RenderTexture>();
const MAX_CACHED_TEXTURES = 100;

const ANIMATED_TILE_TYPES = new Set(["water", "forest", "river"]);

const polygonCache = new Map<string, PIXI.Polygon>();

// Clean up texture cache when it gets too large
function cleanupTextureCache() {
  if (textureCache.size > MAX_CACHED_TEXTURES) {
    const entries = Array.from(textureCache.entries());
    // Remove oldest half of cached textures
    const toRemove = entries.slice(0, Math.floor(entries.length / 2));
    toRemove.forEach(([key, texture]) => {
      texture.destroy(true);
      textureCache.delete(key);
    });
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

function shade(hex: number, factor: number): number {
  const r = Math.max(0, Math.min(255, Math.round(((hex >> 16) & 0xff) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(((hex >> 8) & 0xff) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((hex & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}

function getTextureCacheKey(tileType: string, tileWidth: number, tileHeight: number) {
  return `${tileType}-${tileWidth}x${tileHeight}`;
}

export function getTileTexture(
  tileType: string,
  tileWidth: number,
  tileHeight: number,
  renderer: Renderer,
  tileKey: string,
): PIXI.RenderTexture {
  const cacheKey = getTextureCacheKey(tileType, tileWidth, tileHeight);
  const cached = textureCache.get(cacheKey);
  if (cached) {
    logger.debug(`[TILE_TEXTURE] Cache hit for ${tileKey} using key ${cacheKey}`);
    return cached;
  }

  const startTime = performance.now();
  const tempContainer = new PIXI.Container();
  const baseGraphic = new PIXI.Graphics();
  baseGraphic.position.set(tileWidth / 2, tileHeight / 2);

  const baseColor = TILE_COLORS[tileType] ?? 0xdde7f7;
  const lighter = shade(baseColor, 1.08);
  const darker = shade(baseColor, 0.85);

  // Base diamond with subtle center light and beveled edges
  baseGraphic.fill({ color: baseColor, alpha: 0.96 });
  baseGraphic.moveTo(0, -tileHeight / 2);
  baseGraphic.lineTo(tileWidth / 2, 0);
  baseGraphic.lineTo(0, tileHeight / 2);
  baseGraphic.lineTo(-tileWidth / 2, 0);
  baseGraphic.closePath();
  baseGraphic.fill();

  // Inner highlight diamond
  baseGraphic.fill({ color: lighter, alpha: 0.12 });
  baseGraphic.moveTo(0, -tileHeight * 0.36);
  baseGraphic.lineTo(tileWidth * 0.36, 0);
  baseGraphic.lineTo(0, tileHeight * 0.36);
  baseGraphic.lineTo(-tileWidth * 0.36, 0);
  baseGraphic.closePath();
  baseGraphic.fill();

  // Bevel: darker stroke on right/bottom edges
  baseGraphic.setStrokeStyle({ width: 1.5, color: darker, alpha: 0.55 });
  baseGraphic.moveTo(0, tileHeight / 2);
  baseGraphic.lineTo(tileWidth / 2, 0);
  baseGraphic.lineTo(0, -tileHeight / 2);
  baseGraphic.stroke();
  // Fine outline
  baseGraphic.setStrokeStyle({ width: 1, color: 0x334155, alpha: 0.35 });
  baseGraphic.moveTo(0, -tileHeight / 2);
  baseGraphic.lineTo(tileWidth / 2, 0);
  baseGraphic.lineTo(0, tileHeight / 2);
  baseGraphic.lineTo(-tileWidth / 2, 0);
  baseGraphic.lineTo(0, -tileHeight / 2);
  baseGraphic.stroke();

  tempContainer.addChild(baseGraphic);

  // Subtle terrain micro-textures (drawn into the same render texture)
  const detailGraphic = new PIXI.Graphics();
  detailGraphic.position.set(tileWidth / 2, tileHeight / 2);
  (detailGraphic as unknown as { eventMode: string }).eventMode = "none";

  if (tileType === "water" || tileType === "river") {
    detailGraphic.setStrokeStyle({ width: 1, color: 0x93c5fd, alpha: 0.35 });
    const y0 = -tileHeight * 0.12;
    const y1 = 0;
    const y2 = tileHeight * 0.12;
    detailGraphic.moveTo(-tileWidth * 0.25, y0);
    detailGraphic.quadraticCurveTo(0, y0 + 2, tileWidth * 0.25, y0);
    detailGraphic.moveTo(-tileWidth * 0.3, y1);
    detailGraphic.quadraticCurveTo(0, y1 + 2, tileWidth * 0.3, y1);
    detailGraphic.moveTo(-tileWidth * 0.2, y2);
    detailGraphic.quadraticCurveTo(0, y2 + 2, tileWidth * 0.2, y2);
    detailGraphic.stroke();
  } else if (tileType === "forest") {
    detailGraphic.fill({ color: 0x166534, alpha: 0.12 });
    const s = Math.max(2, Math.floor(tileHeight * 0.08));
    detailGraphic.drawPolygon([-s, 0, 0, -s, s, 0, -s, 0]);
    detailGraphic.endFill();
  } else if (tileType === "mountain") {
    detailGraphic.setStrokeStyle({ width: 1, color: 0x64748b, alpha: 0.35 });
    detailGraphic.moveTo(-tileWidth * 0.2, tileHeight * 0.05);
    detailGraphic.lineTo(0, -tileHeight * 0.15);
    detailGraphic.lineTo(tileWidth * 0.2, tileHeight * 0.05);
    detailGraphic.stroke();
  } else if (tileType === "grass") {
    detailGraphic.setStrokeStyle({ width: 1, color: 0x16a34a, alpha: 0.15 });
    detailGraphic.moveTo(-tileWidth * 0.1, tileHeight * 0.04);
    detailGraphic.lineTo(-tileWidth * 0.02, tileHeight * 0.01);
    detailGraphic.moveTo(tileWidth * 0.1, -tileHeight * 0.04);
    detailGraphic.lineTo(tileWidth * 0.02, -tileHeight * 0.01);
    detailGraphic.stroke();
  }

  if (!detailGraphic.destroyed) {
    tempContainer.addChild(detailGraphic);
  }

  const renderTexture = PIXI.RenderTexture.create({ width: tileWidth, height: tileHeight });
  renderer.render({ container: tempContainer, target: renderTexture, clear: true });

  tempContainer.destroy({ children: true });

  textureCache.set(cacheKey, renderTexture);
  cleanupTextureCache();

  const createTime = performance.now() - startTime;
  logger.debug(
    `[TILE_TEXTURE] Generated texture for ${tileKey} (type: ${tileType}) in ${createTime.toFixed(2)}ms`
  );

  return renderTexture;
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

  const texture = getTileTexture(tileType, tileWidth, tileHeight, renderer, tileKey);
  const sprite = new PIXI.Sprite(texture);
  sprite.anchor.set(0.5, 0.5);
  sprite.position.set(worldX, worldY);
  sprite.zIndex = 2;
  (sprite as unknown as { eventMode: string }).eventMode = "static";
  sprite.hitArea = getSharedDiamondHitArea(tileWidth, tileHeight);
  sprite.cursor = "pointer";

  logger.debug(`[TILE_GRAPHICS] Created sprite for ${tileKey} using cached texture`);

  // Optional animated overlays per tile type
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
  logger.info(`[TILE_CREATE] Created tile ${tileKey} (${tileType}) in ${createTime.toFixed(2)}ms. Sprite ID: ${sprite.uid}`);

  // Dispose method to properly clean up all PIXI objects
  const dispose = () => {
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

    // Clean up main tile sprite
    try {
      if (sprite.parent) {
        const parent = sprite.parent;
        const parentChildrenBefore = parent.children.length;
        parent.removeChild(sprite);
        logger.debug(`[TILE_DISPOSE] Removed tile ${tileKey} from parent. Parent children: ${parentChildrenBefore} -> ${parent.children.length}`);
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

    const disposeTime = performance.now() - disposeStartTime;
    logger.info(`[TILE_DISPOSE] Disposed tile ${tileKey} in ${disposeTime.toFixed(2)}ms. Objects disposed: ${disposedObjects}`);
  };

  return { x: gridX, y: gridY, worldX, worldY, tileType, sprite, overlay, dispose };
}

