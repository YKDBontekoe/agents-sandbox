import type { FederatedPointerEvent } from "pixi.js";
import { Viewport } from "pixi-viewport";

interface CanvasEventsOptions {
  viewport: Viewport;
  onTileHover?: (x: number, y: number, tileType?: string) => void;
  onTileClick?: (x: number, y: number, tileType?: string) => void;
}

/**
 * Attach basic hover and click handlers to a viewport.
 */
export function attachCanvasEvents({
  viewport,
  onTileHover,
  onTileClick,
}: CanvasEventsOptions): () => void {
  const getGlobalXY = (event: FederatedPointerEvent) => {
    const { globalX, globalY, global } = event;

    if (Number.isFinite(globalX) && Number.isFinite(globalY)) {
      return { x: globalX, y: globalY };
    }

    if (global && Number.isFinite(global.x) && Number.isFinite(global.y)) {
      return { x: global.x, y: global.y };
    }

    return { x: 0, y: 0 };
  };

  const handlePointerMove = (event: FederatedPointerEvent) => {
    if (!onTileHover) return;
    const { x: gx, y: gy } = getGlobalXY(event);
    const worldPos = viewport.toWorld(gx, gy);
    const x = Math.floor(worldPos.x);
    const y = Math.floor(worldPos.y);
    onTileHover(x, y);
  };

  const handlePointerTap = (event: FederatedPointerEvent) => {
    if (!onTileClick) return;
    const { x: gx, y: gy } = getGlobalXY(event);
    const worldPos = viewport.toWorld(gx, gy);
    const x = Math.floor(worldPos.x);
    const y = Math.floor(worldPos.y);
    onTileClick(x, y);
  };

  viewport.on("pointermove", handlePointerMove);
  viewport.on("pointertap", handlePointerTap);

  return () => {
    viewport.off("pointermove", handlePointerMove);
    viewport.off("pointertap", handlePointerTap);
  };
}

export type { CanvasEventsOptions };
