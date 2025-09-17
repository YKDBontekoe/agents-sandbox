import type { Viewport } from "pixi-viewport";

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportChangeWatcherOptions {
  viewport: Viewport;
  onChange: (bounds: ViewportBounds, scale: number) => void;
  debounceMs?: number;
  positionThreshold?: number;
  sizeThreshold?: number;
  scaleThreshold?: number;
  emitInitial?: boolean;
}

const DEFAULT_DEBOUNCE_MS = 150;
const DEFAULT_POSITION_THRESHOLD = 50;
const DEFAULT_SIZE_THRESHOLD = 100;
const DEFAULT_SCALE_THRESHOLD = 0.05;

function getViewportBounds(viewport: Viewport): ViewportBounds {
  return {
    x: viewport.left,
    y: viewport.top,
    width: viewport.worldScreenWidth,
    height: viewport.worldScreenHeight,
  };
}

function getViewportScale(viewport: Viewport): number {
  const { scale } = viewport;
  if (!scale) {
    return 1;
  }
  if (typeof scale.x === "number") {
    return scale.x;
  }
  if (typeof scale.y === "number") {
    return scale.y;
  }
  return 1;
}

export function createViewportChangeWatcher({
  viewport,
  onChange,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  positionThreshold = DEFAULT_POSITION_THRESHOLD,
  sizeThreshold = DEFAULT_SIZE_THRESHOLD,
  scaleThreshold = DEFAULT_SCALE_THRESHOLD,
  emitInitial = true,
}: ViewportChangeWatcherOptions): () => void {
  const events = ["moved", "zoomed", "moved-end", "zoomed-end"] as const;

  let lastBounds = getViewportBounds(viewport);
  let lastScale = getViewportScale(viewport);
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const scheduleEmit = (bounds: ViewportBounds, scale: number) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      onChange(bounds, scale);
      lastBounds = bounds;
      lastScale = scale;
    }, debounceMs);
  };

  const handleViewportChange = () => {
    const bounds = getViewportBounds(viewport);
    const scale = getViewportScale(viewport);

    const positionChanged =
      Math.abs(bounds.x - lastBounds.x) > positionThreshold ||
      Math.abs(bounds.y - lastBounds.y) > positionThreshold;
    const sizeChanged =
      Math.abs(bounds.width - lastBounds.width) > sizeThreshold ||
      Math.abs(bounds.height - lastBounds.height) > sizeThreshold;
    const scaleChanged = Math.abs(scale - lastScale) > scaleThreshold;

    if (positionChanged || sizeChanged || scaleChanged) {
      scheduleEmit(bounds, scale);
    }
  };

  for (const event of events) {
    viewport.on(event, handleViewportChange);
  }

  if (emitInitial) {
    const initialBounds = getViewportBounds(viewport);
    const initialScale = getViewportScale(viewport);
    onChange(initialBounds, initialScale);
    lastBounds = initialBounds;
    lastScale = initialScale;
  }

  return () => {
    if (timeout) {
      clearTimeout(timeout);
    }

    for (const event of events) {
      viewport.off(event, handleViewportChange);
    }
  };
}
