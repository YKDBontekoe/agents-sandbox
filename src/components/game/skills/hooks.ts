import { useEffect, useRef } from 'react';

// Performance-optimized animation frame hook with throttling
export function useAnimationFrame(callback: (dt: number) => void) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const throttleRef = useRef<number>(0);
  const TARGET_FPS = 60;
  const FRAME_TIME = 1000 / TARGET_FPS;

  useEffect(() => {
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTimeRef.current;

      // Throttle to maintain consistent frame rate
      if (currentTime - throttleRef.current >= FRAME_TIME) {
        lastTimeRef.current = currentTime;
        throttleRef.current = currentTime;
        callback(deltaTime);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [callback]);
}
