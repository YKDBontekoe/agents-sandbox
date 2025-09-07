/**
 * Request animation frame with fallback
 */
export const requestAnimFrame = (
  callback: FrameRequestCallback
): number => {
  const raf =
    window.requestAnimationFrame ||
    (window as Window & { webkitRequestAnimationFrame?: typeof window.requestAnimationFrame }).webkitRequestAnimationFrame ||
    ((cb: FrameRequestCallback) => window.setTimeout(cb, 1000 / 60));
  return raf(callback);
};

/**
 * Cancel animation frame with fallback
 */
export const cancelAnimFrame = (id: number): void => {
  const caf =
    window.cancelAnimationFrame ||
    (window as Window & { webkitCancelAnimationFrame?: typeof window.cancelAnimationFrame }).webkitCancelAnimationFrame ||
    window.clearTimeout;
  caf(id as unknown as number);
};
