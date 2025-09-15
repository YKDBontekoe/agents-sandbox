import * as PIXI from "pixi.js";
import { gridToWorld, TILE_COLORS } from "@/lib/isometric";
import logger from "@/lib/logger";

export interface GridTile {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  tileType: string;
  sprite: PIXI.Graphics;
  dispose: () => void; // Add cleanup method
}

// Texture cache to prevent memory leaks
const textureCache = new Map<string, PIXI.Texture>();
const MAX_CACHED_TEXTURES = 100;

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

function shade(hex: number, factor: number): number {
  const r = Math.max(0, Math.min(255, Math.round(((hex >> 16) & 0xff) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(((hex >> 8) & 0xff) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((hex & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}

export function createTileSprite(
  gridX: number,
  gridY: number,
  gridContainer: PIXI.Container,
  tileWidth: number,
  tileHeight: number,
  tileTypes: string[][],
): GridTile {
  const startTime = performance.now();
  const tileKey = `${gridX},${gridY}`;
  
  logger.debug(`[TILE_CREATE] Starting creation of tile ${tileKey}`);
  
  const { worldX, worldY } = gridToWorld(gridX, gridY, tileWidth, tileHeight);
  const tileType = tileTypes[gridY]?.[gridX] || "unknown";

  logger.debug(`[TILE_CREATE] Creating tile ${tileKey} (${tileType}) at world position (${worldX}, ${worldY})`);

  const tile = new PIXI.Graphics();
  const base = TILE_COLORS[tileType] ?? 0xdde7f7;
  const lighter = shade(base, 1.08);
  const darker = shade(base, 0.85);

  // Base diamond with subtle center light and beveled edges
  tile.fill({ color: base, alpha: 0.96 });
  tile.moveTo(0, -tileHeight / 2);
  tile.lineTo(tileWidth / 2, 0);
  tile.lineTo(0, tileHeight / 2);
  tile.lineTo(-tileWidth / 2, 0);
  tile.closePath();
  tile.fill();

  // Inner highlight diamond
  tile.fill({ color: lighter, alpha: 0.12 });
  tile.moveTo(0, -tileHeight * 0.36);
  tile.lineTo(tileWidth * 0.36, 0);
  tile.lineTo(0, tileHeight * 0.36);
  tile.lineTo(-tileWidth * 0.36, 0);
  tile.closePath();
  tile.fill();

  // Bevel: darker stroke on right/bottom edges
  tile.setStrokeStyle({ width: 1.5, color: darker, alpha: 0.55 });
  tile.moveTo(0, tileHeight / 2);
  tile.lineTo(tileWidth / 2, 0);
  tile.lineTo(0, -tileHeight / 2);
  tile.stroke();
  // Fine outline
  tile.setStrokeStyle({ width: 1, color: 0x334155, alpha: 0.35 });
  tile.moveTo(0, -tileHeight / 2);
  tile.lineTo(tileWidth / 2, 0);
  tile.lineTo(0, tileHeight / 2);
  tile.lineTo(-tileWidth / 2, 0);
  tile.lineTo(0, -tileHeight / 2);
  tile.stroke();

  logger.debug(`[TILE_GRAPHICS] Created main sprite for ${tileKey} with base color 0x${base.toString(16)}`);

  // Subtle terrain micro-textures
  const tex = new PIXI.Graphics();
  tex.zIndex = 3;
  tex.position.set(worldX, worldY);
    (tex as unknown as { eventMode: string }).eventMode = "none";
  if (tileType === "water") {
    tex.setStrokeStyle({ width: 1, color: 0x93c5fd, alpha: 0.35 });
    const y0 = -tileHeight * 0.12, y1 = 0, y2 = tileHeight * 0.12;
    tex.moveTo(-tileWidth * 0.25, y0); tex.quadraticCurveTo(0, y0 + 2, tileWidth * 0.25, y0);
    tex.moveTo(-tileWidth * 0.3, y1); tex.quadraticCurveTo(0, y1 + 2, tileWidth * 0.3, y1);
    tex.moveTo(-tileWidth * 0.2, y2); tex.quadraticCurveTo(0, y2 + 2, tileWidth * 0.2, y2);
    tex.stroke();
    logger.debug(`[TILE_GRAPHICS] Added water texture to tile ${tileKey}`);
  } else if (tileType === "forest") {
    tex.fill({ color: 0x166534, alpha: 0.12 });
    const s = Math.max(2, Math.floor(tileHeight * 0.08));
    tex.drawPolygon([-s, 0, 0, -s, s, 0, -s, 0]);
    tex.endFill();
    logger.debug(`[TILE_GRAPHICS] Added forest texture to tile ${tileKey}`);
  } else if (tileType === "mountain") {
    tex.setStrokeStyle({ width: 1, color: 0x64748b, alpha: 0.35 });
    tex.moveTo(-tileWidth * 0.2, tileHeight * 0.05);
    tex.lineTo(0, -tileHeight * 0.15);
    tex.lineTo(tileWidth * 0.2, tileHeight * 0.05);
    tex.stroke();
    logger.debug(`[TILE_GRAPHICS] Added mountain texture to tile ${tileKey}`);
  } else if (tileType === "grass") {
    tex.setStrokeStyle({ width: 1, color: 0x16a34a, alpha: 0.15 });
    tex.moveTo(-tileWidth * 0.1, tileHeight * 0.04);
    tex.lineTo(-tileWidth * 0.02, tileHeight * 0.01);
    tex.moveTo(tileWidth * 0.1, -tileHeight * 0.04);
    tex.lineTo(tileWidth * 0.02, -tileHeight * 0.01);
    tex.stroke();
    logger.debug(`[TILE_GRAPHICS] Added grass texture to tile ${tileKey}`);
  }
  gridContainer.addChild(tex);
    (tile as PIXI.Graphics & { __tex?: PIXI.Graphics }).__tex = tex;

  logger.debug(`[TILE_GRAPHICS] Added texture graphics to grid container for ${tileKey}. Container children: ${gridContainer.children.length}`);

  tile.x = worldX;
  tile.y = worldY;
    (tile as unknown as { eventMode: string }).eventMode = "static";
  const hx = (tileWidth / 2) * 0.95;
  const hy = (tileHeight / 2) * 0.95;
  tile.hitArea = new PIXI.Polygon([0, -hy, hx, 0, 0, hy, -hx, 0]);
  tile.cursor = "pointer";

  // Optional animated overlays per tile type
  const overlay = new PIXI.Graphics();
  overlay.zIndex = 5;
    (overlay as unknown as { eventMode: string }).eventMode = "none";
  overlay.position.set(worldX, worldY);
  gridContainer.addChild(overlay);
    (tile as PIXI.Graphics & { __overlay?: PIXI.Graphics }).__overlay = overlay;

  logger.debug(`[TILE_GRAPHICS] Added overlay graphics to grid container for ${tileKey}`);

  const createTime = performance.now() - startTime;
  logger.info(`[TILE_CREATE] Created tile ${tileKey} (${tileType}) in ${createTime.toFixed(2)}ms. Sprite ID: ${tile.uid}`);

  // Dispose method to properly clean up all PIXI objects
  const dispose = () => {
    const disposeStartTime = performance.now();
    logger.debug(`[TILE_DISPOSE] Starting disposal of tile ${tileKey}. Sprite destroyed: ${tile.destroyed}`);
    
    let disposedObjects = 0;
    
    // Clean up texture graphics
    const tileWithExtras = tile as PIXI.Graphics & { __tex?: PIXI.Graphics; __overlay?: PIXI.Graphics };
    
    try {
      if (tileWithExtras.__tex && !tileWithExtras.__tex.destroyed) {
        if (tileWithExtras.__tex.parent) {
          tileWithExtras.__tex.parent.removeChild(tileWithExtras.__tex);
        }
        tileWithExtras.__tex.destroy({ children: true, texture: true });
        tileWithExtras.__tex = undefined;
        disposedObjects++;
        logger.debug(`[TILE_DISPOSE] Destroyed texture graphics for tile ${tileKey}`);
      }
    } catch (error) {
      logger.error(`[TILE_DISPOSE] Error destroying texture graphics for tile ${tileKey}:`, error);
    }
    
    try {
      if (tileWithExtras.__overlay && !tileWithExtras.__overlay.destroyed) {
        if (tileWithExtras.__overlay.parent) {
          tileWithExtras.__overlay.parent.removeChild(tileWithExtras.__overlay);
        }
        tileWithExtras.__overlay.destroy({ children: true, texture: true });
        tileWithExtras.__overlay = undefined;
        disposedObjects++;
        logger.debug(`[TILE_DISPOSE] Destroyed overlay graphics for tile ${tileKey}`);
      }
    } catch (error) {
      logger.error(`[TILE_DISPOSE] Error destroying overlay graphics for tile ${tileKey}:`, error);
    }
    
    // Clean up main tile sprite
    try {
      if (tile.parent) {
        const parentChildrenBefore = tile.parent.children.length;
        tile.parent.removeChild(tile);
        logger.debug(`[TILE_DISPOSE] Removed tile ${tileKey} from parent. Parent children: ${parentChildrenBefore} -> ${tile.parent.children.length}`);
      }
      
      if (!tile.destroyed) {
        tile.destroy({ children: true, texture: true });
        disposedObjects++;
        logger.debug(`[TILE_DISPOSE] Destroyed main sprite for tile ${tileKey}`);
      }
    } catch (error) {
      logger.error(`[TILE_DISPOSE] Error destroying main sprite for tile ${tileKey}:`, error);
    }
    
    const disposeTime = performance.now() - disposeStartTime;
    logger.info(`[TILE_DISPOSE] Disposed tile ${tileKey} in ${disposeTime.toFixed(2)}ms. Objects disposed: ${disposedObjects}`);
  };

  return { x: gridX, y: gridY, worldX, worldY, tileType, sprite: tile, dispose };
}

