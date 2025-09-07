/**
 * Throttle function calls to improve performance
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this as never, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
