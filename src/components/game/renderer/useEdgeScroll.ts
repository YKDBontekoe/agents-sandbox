import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { Viewport } from "pixi-viewport";
import type * as PIXI from "pixi.js";

interface EdgeScrollState {
  vx: number;
  vy: number;
  raf: number | null;
}

interface UseEdgeScrollOptions {
  containerRef: MutableRefObject<HTMLElement | null>;
  viewport: Viewport | null;
  app: PIXI.Application | null;
  enabled?: boolean;
  margin?: number;
  maxSpeed?: number;
}

const DEFAULT_MARGIN = 24;
const DEFAULT_MAX_SPEED = 12;

export function useEdgeScroll({
  containerRef,
  viewport,
  app,
  enabled = true,
  margin = DEFAULT_MARGIN,
  maxSpeed = DEFAULT_MAX_SPEED,
}: UseEdgeScrollOptions) {
  const stateRef = useRef<EdgeScrollState>({ vx: 0, vy: 0, raf: null });

  useEffect(() => {
    const element = containerRef.current;
    const ticker = app?.ticker;

    if (!enabled || !element || !viewport || !ticker) {
      return undefined;
    }

    const state = stateRef.current;

    const stopAnimation = () => {
      if (state.raf !== null) {
        state.raf = null;
        ticker.remove(animate);
      }
    };

    const animate = () => {
      const { vx, vy } = state;
      if (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) {
        stopAnimation();
        return;
      }
      viewport.moveCenter(viewport.center.x + vx, viewport.center.y + vy);
    };

    const startAnimation = () => {
      if (state.raf === null) {
        state.raf = 1;
        ticker.add(animate);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const relativeY = event.clientY - rect.top;

      let vx = 0;
      let vy = 0;

      if (relativeX < margin) {
        vx = -((margin - relativeX) / margin) * maxSpeed;
      } else if (relativeX > rect.width - margin) {
        vx = ((relativeX - (rect.width - margin)) / margin) * maxSpeed;
      }

      if (relativeY < margin) {
        vy = -((margin - relativeY) / margin) * maxSpeed;
      } else if (relativeY > rect.height - margin) {
        vy = ((relativeY - (rect.height - margin)) / margin) * maxSpeed;
      }

      state.vx = vx;
      state.vy = vy;

      if (vx !== 0 || vy !== 0) {
        startAnimation();
      } else {
        stopAnimation();
      }
    };

    const handleMouseLeave = () => {
      state.vx = 0;
      state.vy = 0;
      stopAnimation();
    };

    element.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      element.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("mouseleave", handleMouseLeave);
      stopAnimation();
      state.vx = 0;
      state.vy = 0;
    };
  }, [app, containerRef, enabled, margin, maxSpeed, viewport]);
}
