"use client";

import { useEffect } from "react";
import { Viewport } from "pixi-viewport";

/**
 * Apply common viewport interactions like drag, pinch zoom and clamping.
 * Call this hook with a pixi-viewport instance to enable standard controls.
 */
export default function useViewport(viewport: Viewport | null) {
  useEffect(() => {
    if (!viewport) return;

    viewport
      .drag({ mouseButtons: "left" })
      .pinch()
      .wheel({ smooth: 3, percent: 0.1 })
      .decelerate({ friction: 0.95, bounce: 0.8, minSpeed: 0.01 })
      .clampZoom({ minScale: 0.1, maxScale: 3 })
      .clamp({ left: -500, right: 2500, top: -500, bottom: 2500 });
  }, [viewport]);
}
