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
  const handlePointerMove = (event: FederatedPointerEvent) => {
    if (!onTileHover) return;
    const x = Math.floor(event.world.x);
    const y = Math.floor(event.world.y);
    onTileHover(x, y);
  };

  const handlePointerTap = (event: FederatedPointerEvent) => {
    if (!onTileClick) return;
    const x = Math.floor(event.world.x);
    const y = Math.floor(event.world.y);
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
