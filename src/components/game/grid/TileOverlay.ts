import * as PIXI from "pixi.js";
import { gridToWorld } from "@/lib/isometric";
import logger from "@/lib/logger";

export interface TileOverlayOptions {
  tileWidth: number;
  tileHeight: number;
  getTileType: (x: number, y: number) => string | undefined;
  onTileHover?: (x: number, y: number, tileType?: string) => void;
  onTileClick?: (x: number, y: number, tileType?: string) => void;
}

export class TileOverlay {
  hoverOverlay: PIXI.Graphics;
  selectOverlay: PIXI.Graphics;
  private lastHoverIndex: { x: number; y: number } | null = null;
  private hoverDebounce: number | null = null;
  private interactionCount = 0;
  private createdAt: number;

  constructor(private container: PIXI.Container, private opts: TileOverlayOptions) {
    this.createdAt = performance.now();
    logger.info(`[OVERLAY_CREATE] Creating TileOverlay for container with ${container.children.length} children`);
    
    this.hoverOverlay = this.makeOverlay(0x4f46e5, 0.25);
    this.selectOverlay = this.makeOverlay(0x10b981, 0.3);
    
    logger.debug(`[OVERLAY_CREATE] Created hover overlay (ID: ${this.hoverOverlay.uid}) and select overlay (ID: ${this.selectOverlay.uid})`);
    
    container.addChild(this.hoverOverlay);
    container.addChild(this.selectOverlay);
    
    logger.debug(`[OVERLAY_CREATE] Added overlays to container. Container children: ${container.children.length}`);

    container.on("pointerleave", this.onPointerLeave);
    container.on("pointermove", this.onPointerMove);
    container.on("pointertap", this.onPointerTap);
    
    logger.info(`[OVERLAY_CREATE] TileOverlay initialized with event listeners in ${(performance.now() - this.createdAt).toFixed(2)}ms`);
  }

  private makeOverlay(color: number, alpha: number) {
    const startTime = performance.now();
    const g = new PIXI.Graphics();
    g.zIndex = 9999;
      (g as unknown as { eventMode: string }).eventMode = "none";
    g.clear();
    g.fill({ color, alpha });
    g.moveTo(0, -this.opts.tileHeight / 2);
    g.lineTo(this.opts.tileWidth / 2, 0);
    g.lineTo(0, this.opts.tileHeight / 2);
    g.lineTo(-this.opts.tileWidth / 2, 0);
    g.closePath();
    g.fill();
    g.visible = false;
    
    const createTime = performance.now() - startTime;
    logger.debug(`[OVERLAY_CREATE] Created overlay graphics (ID: ${g.uid}) with color 0x${color.toString(16)} in ${createTime.toFixed(2)}ms`);
    
    return g;
  }

  destroy() {
    const startTime = performance.now();
    logger.info(`[OVERLAY_DESTROY] Starting overlay destruction. Total interactions: ${this.interactionCount}, Lifetime: ${(startTime - this.createdAt).toFixed(2)}ms`);
    
    // Clear any pending debounce
    if (this.hoverDebounce) {
      clearTimeout(this.hoverDebounce);
      this.hoverDebounce = null;
      logger.debug(`[OVERLAY_DESTROY] Cleared pending hover debounce`);
    }
    
    // Remove event listeners
    this.container.off("pointerleave", this.onPointerLeave);
    this.container.off("pointermove", this.onPointerMove);
    this.container.off("pointertap", this.onPointerTap);
    logger.debug(`[OVERLAY_DESTROY] Removed event listeners`);
    
    // Destroy overlays
    try {
      if (this.hoverOverlay && !this.hoverOverlay.destroyed) {
        if (this.hoverOverlay.parent) {
          this.hoverOverlay.parent.removeChild(this.hoverOverlay);
        }
        this.hoverOverlay.destroy({ children: true, texture: true });
        logger.debug(`[OVERLAY_DESTROY] Destroyed hover overlay (ID: ${this.hoverOverlay.uid})`);
      }
    } catch (error) {
      logger.error(`[OVERLAY_DESTROY] Error destroying hover overlay:`, error);
    }
    
    try {
      if (this.selectOverlay && !this.selectOverlay.destroyed) {
        if (this.selectOverlay.parent) {
          this.selectOverlay.parent.removeChild(this.selectOverlay);
        }
        this.selectOverlay.destroy({ children: true, texture: true });
        logger.debug(`[OVERLAY_DESTROY] Destroyed select overlay (ID: ${this.selectOverlay.uid})`);
      }
    } catch (error) {
      logger.error(`[OVERLAY_DESTROY] Error destroying select overlay:`, error);
    }
    
    const destroyTime = performance.now() - startTime;
    logger.info(`[OVERLAY_DESTROY] Overlay destruction completed in ${destroyTime.toFixed(2)}ms`);
  }

  private toTileIndex(wx: number, wy: number) {
    const tw2 = this.opts.tileWidth / 2;
    const th2 = this.opts.tileHeight / 2;
    const fx = wy / th2 + wx / tw2;
    const fy = wy / th2 - wx / tw2;
    const gx = Math.round(fx / 2);
    const gy = Math.round(fy / 2);
    return { gx, gy };
  }

  private onPointerLeave = () => {
    logger.debug(`[OVERLAY_INTERACTION] Pointer left container. Hiding hover overlay. Total interactions: ${this.interactionCount}`);
    this.hoverOverlay.visible = false;
    this.lastHoverIndex = null;
    if (this.hoverDebounce) {
      clearTimeout(this.hoverDebounce);
      this.hoverDebounce = null;
      logger.debug(`[OVERLAY_INTERACTION] Cleared hover debounce timer`);
    }
  };

  private onPointerMove = (e: PIXI.FederatedPointerEvent) => {
    const local = this.container.toLocal({ x: e.globalX, y: e.globalY } as PIXI.PointData);
    const { gx, gy } = this.toTileIndex(local.x, local.y);
    const tileType = this.opts.getTileType(gx, gy);
    
    this.interactionCount++;
    
    if (gx < 0 || gy < 0 || tileType === undefined) {
      if (this.hoverOverlay.visible) {
        logger.debug(`[OVERLAY_INTERACTION] Hiding hover overlay - out of bounds tile (${gx}, ${gy})`);
        this.hoverOverlay.visible = false;
      }
      this.lastHoverIndex = null;
      return;
    }
    const last = this.lastHoverIndex;
    if (!last || last.x !== gx || last.y !== gy) {
      if (this.hoverDebounce) {
        clearTimeout(this.hoverDebounce);
        this.hoverDebounce = null;
      }
      const targetX = gx, targetY = gy;
      this.hoverDebounce = window.setTimeout(() => {
        this.lastHoverIndex = { x: targetX, y: targetY };
        const { worldX, worldY } = gridToWorld(targetX, targetY, this.opts.tileWidth, this.opts.tileHeight);
        
        if (!this.hoverOverlay.visible) {
          logger.debug(`[OVERLAY_INTERACTION] Showing hover overlay for tile (${targetX}, ${targetY}) type: ${this.opts.getTileType(targetX, targetY)}`);
        }
        
        this.hoverOverlay.visible = true;
        this.hoverOverlay.position.set(worldX, worldY);
        
        logger.debug(`[OVERLAY_INTERACTION] Triggering hover callback for tile (${targetX}, ${targetY}) type: ${this.opts.getTileType(targetX, targetY)}`);
        this.opts.onTileHover?.(targetX, targetY, this.opts.getTileType(targetX, targetY));
      }, 20);
    }
  };

  private onPointerTap = (e: PIXI.FederatedPointerEvent) => {
    const local = this.container.toLocal({ x: e.globalX, y: e.globalY } as PIXI.PointData);
    const { gx, gy } = this.toTileIndex(local.x, local.y);
    const tileType = this.opts.getTileType(gx, gy);
    
    this.interactionCount++;
    
    if (gx < 0 || gy < 0 || tileType === undefined) {
      logger.debug(`[OVERLAY_INTERACTION] Tap ignored - out of bounds tile (${gx}, ${gy})`);
      return;
    }
    
    logger.debug(`[OVERLAY_INTERACTION] Tile tapped at (${gx}, ${gy}) type: ${tileType}`);
    
    const { worldX, worldY } = gridToWorld(gx, gy, this.opts.tileWidth, this.opts.tileHeight);
    this.selectOverlay.visible = true;
    this.selectOverlay.position.set(worldX, worldY);
    
    logger.debug(`[OVERLAY_INTERACTION] Select overlay positioned at world (${worldX.toFixed(2)}, ${worldY.toFixed(2)})`);
    
    this.opts.onTileClick?.(gx, gy, tileType);
  };

}

