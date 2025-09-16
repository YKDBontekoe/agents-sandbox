import { TIME_SPEEDS, type TimeSpeed } from '@engine';

const BASE_INTERVAL_MS = 60000;

const SPEED_RATIO_TARGETS: Array<{ speed: TimeSpeed; ratio: number }> = [
  { speed: TIME_SPEEDS.NORMAL, ratio: 1 },
  { speed: TIME_SPEEDS.FAST, ratio: 2 },
  { speed: TIME_SPEEDS.VERY_FAST, ratio: 4 },
  { speed: TIME_SPEEDS.ULTRA_FAST, ratio: 8 },
  { speed: TIME_SPEEDS.HYPER_SPEED, ratio: 20 },
];

export function sanitizeIntervalMs(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const rounded = Math.round(numeric);
  if (rounded <= 0) {
    return null;
  }
  return rounded;
}

export function intervalMsToTimeSpeed(intervalMs: number): TimeSpeed {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return TIME_SPEEDS.NORMAL;
  }

  const ratio = BASE_INTERVAL_MS / intervalMs;

  let closest = SPEED_RATIO_TARGETS[0];
  let smallestDelta = Number.POSITIVE_INFINITY;

  for (const candidate of SPEED_RATIO_TARGETS) {
    const delta = Math.abs(candidate.ratio - ratio);
    if (delta < smallestDelta) {
      smallestDelta = delta;
      closest = candidate;
    }
  }

  return closest.speed;
}
