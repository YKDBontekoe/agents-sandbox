import { useEffect } from "react";
import type { Viewport } from "pixi-viewport";

interface UseKeyboardNavigationOptions {
  viewport: Viewport | null;
  gridSize?: number;
  step?: number;
  zoomStep?: number;
}

const DEFAULT_STEP = 64;
const DEFAULT_ZOOM_STEP = 0.1;

export function useKeyboardNavigation({
  viewport,
  gridSize = 20,
  step = DEFAULT_STEP,
  zoomStep = DEFAULT_ZOOM_STEP,
}: UseKeyboardNavigationOptions) {
  useEffect(() => {
    if (!viewport) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key;
      const lowerKey = key.toLowerCase();

      if (key === "ArrowLeft" || lowerKey === "a") {
        viewport.moveCenter(viewport.center.x - step, viewport.center.y);
      } else if (key === "ArrowRight" || lowerKey === "d") {
        viewport.moveCenter(viewport.center.x + step, viewport.center.y);
      } else if (key === "ArrowUp" || lowerKey === "w") {
        viewport.moveCenter(viewport.center.x, viewport.center.y - step);
      } else if (key === "ArrowDown" || lowerKey === "s") {
        viewport.moveCenter(viewport.center.x, viewport.center.y + step);
      } else if (key === "+" || key === "=" || lowerKey === "e") {
        viewport.setZoom(viewport.scale.x * (1 + zoomStep));
      } else if (key === "-" || lowerKey === "q") {
        viewport.setZoom(viewport.scale.x * (1 - zoomStep));
      } else if (key === "0") {
        const midY = (gridSize - 1) * (32 / 2);
        viewport.moveCenter(0, midY);
        viewport.setZoom(1.2);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewport, gridSize, step, zoomStep]);
}
