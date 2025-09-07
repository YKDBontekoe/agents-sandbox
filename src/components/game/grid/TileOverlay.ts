import * as PIXI from "pixi.js";
import { gridToWorld } from "@/lib/isometric";

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

  constructor(private container: PIXI.Container, private opts: TileOverlayOptions) {
    this.hoverOverlay = this.makeOverlay(0x4f46e5, 0.25);
    this.selectOverlay = this.makeOverlay(0x10b981, 0.3);
    container.addChild(this.hoverOverlay);
    container.addChild(this.selectOverlay);

    container.on("pointerleave", this.onPointerLeave);
    container.on("pointermove", this.onPointerMove);
    container.on("pointertap", this.onPointerTap);
  }

  private makeOverlay(color: number, alpha: number) {
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
    return g;
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
    this.hoverOverlay.visible = false;
    this.lastHoverIndex = null;
  };

  private onPointerMove = (e: PIXI.FederatedPointerEvent) => {
      const local = this.container.toLocal({ x: e.globalX, y: e.globalY } as PIXI.PointData);
    const { gx, gy } = this.toTileIndex(local.x, local.y);
    const keyType = this.opts.getTileType(gx, gy);
    if (gx < 0 || gy < 0 || keyType === undefined) {
      this.hoverOverlay.visible = false;
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
        this.hoverOverlay.visible = true;
        this.hoverOverlay.position.set(worldX, worldY);
        this.opts.onTileHover?.(targetX, targetY, this.opts.getTileType(targetX, targetY));
      }, 20);
    }
  };

  private onPointerTap = (e: PIXI.FederatedPointerEvent) => {
    const local = this.container.toLocal({ x: e.globalX, y: e.globalY } as PIXI.PointData);
    const { gx, gy } = this.toTileIndex(local.x, local.y);
    const tileType = this.opts.getTileType(gx, gy);
    if (gx < 0 || gy < 0 || tileType === undefined) return;
    const { worldX, worldY } = gridToWorld(gx, gy, this.opts.tileWidth, this.opts.tileHeight);
    this.selectOverlay.visible = true;
    this.selectOverlay.position.set(worldX, worldY);
    this.opts.onTileClick?.(gx, gy, tileType);
  };

  destroy() {
    this.container.off("pointerleave", this.onPointerLeave);
    this.container.off("pointermove", this.onPointerMove);
    this.container.off("pointertap", this.onPointerTap);
    if (this.hoverDebounce) {
      clearTimeout(this.hoverDebounce);
      this.hoverDebounce = null;
    }
    this.container.removeChild(this.hoverOverlay);
    this.container.removeChild(this.selectOverlay);
    this.hoverOverlay.destroy();
    this.selectOverlay.destroy();
  }
}

