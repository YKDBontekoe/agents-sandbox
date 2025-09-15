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
    const gx = (event as any).globalX as number | undefined;
    const gy = (event as any).globalY as number | undefined;
    if (typeof gx === "number" && typeof gy === "number") return { x: gx, y: gy };
    const g = (event as any).global as { x: number; y: number } | undefined;
    return { x: g?.x ?? 0, y: g?.y ?? 0 };
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
