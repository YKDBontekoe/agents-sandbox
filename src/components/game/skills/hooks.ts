import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

// Performance-optimized animation frame hook with PIXI ticker support
export function useAnimationFrame(callback: (dt: number) => void, app?: PIXI.Application | null) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const throttleRef = useRef<number>(0);
  const isAnimatingRef = useRef<boolean>(false);

  useEffect(() => {
    const TARGET_FPS = 60;
    const FRAME_TIME = 1000 / TARGET_FPS;

    const animateRAF = (currentTime: number) => {
      const deltaTime = currentTime - lastTimeRef.current;

      // Throttle to maintain consistent frame rate
      if (currentTime - throttleRef.current >= FRAME_TIME) {
        lastTimeRef.current = currentTime;
        throttleRef.current = currentTime;
        callback(deltaTime);
      }

      rafRef.current = requestAnimationFrame(animateRAF);
    };

    const animateTicker = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTimeRef.current;

      // Throttle to maintain consistent frame rate
      if (currentTime - throttleRef.current >= FRAME_TIME) {
        lastTimeRef.current = currentTime;
        throttleRef.current = currentTime;
        callback(deltaTime);
      }
    };

    if (app && !isAnimatingRef.current) {
      // Use PIXI ticker when app is available
      isAnimatingRef.current = true;
      app.ticker.add(animateTicker);
    } else if (!app) {
      // Fallback to requestAnimationFrame
      rafRef.current = requestAnimationFrame(animateRAF);
    }

    return () => {
      if (app && isAnimatingRef.current) {
        app.ticker.remove(animateTicker);
        isAnimatingRef.current = false;
      } else if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [callback, app]);
}
