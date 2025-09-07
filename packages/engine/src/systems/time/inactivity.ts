import { TIME_SPEEDS } from '../../types/gameTime';
import type { TimeSystem } from './timeSystem';

// Sets up inactivity detection that temporarily accelerates time when the user is idle.
// Returns a cleanup function to remove event listeners and timers.
export function setupInactivityDetection(system: TimeSystem): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let inactivityTimer: number | null = null;
  let autoAcceleration = false;
  let previousSpeed = system.getCurrentSpeed();

  const resetInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    if (autoAcceleration) {
      autoAcceleration = false;
      system.setSpeed(previousSpeed);
    } else {
      previousSpeed = system.getCurrentSpeed();
    }

    inactivityTimer = window.setTimeout(() => {
      const current = system.getCurrentSpeed();
      if (current !== TIME_SPEEDS.PAUSED && current !== TIME_SPEEDS.VERY_FAST) {
        autoAcceleration = true;
        previousSpeed = current;
        system.setSpeed(TIME_SPEEDS.VERY_FAST);
      }
    }, 30000);
  };

  const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'] as const;
  events.forEach(event => {
    document.addEventListener(event, resetInactivityTimer, { passive: true });
  });

  resetInactivityTimer();

  return () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    events.forEach(event => {
      document.removeEventListener(event, resetInactivityTimer);
    });
  };
}
