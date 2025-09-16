import type { Dispatch, SetStateAction } from 'react';
import { timeSystem, TIME_SPEEDS } from '@engine';

const JSON_HEADERS: Readonly<Record<string, string>> = {
  'Content-Type': 'application/json',
};

export type SimulationControlOptions = {
  stateId?: string | null;
  setIsPaused: Dispatch<SetStateAction<boolean>>;
  controller?: Pick<typeof timeSystem, 'setSpeed'>;
  fetchImpl?: typeof fetch;
};

export function pauseSimulation({
  stateId,
  setIsPaused,
  controller = timeSystem,
  fetchImpl = fetch,
}: SimulationControlOptions): void {
  controller.setSpeed(TIME_SPEEDS.PAUSED);
  setIsPaused(true);

  if (!stateId) return;

  void fetchImpl('/api/state', {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ id: stateId, auto_ticking: false }),
  });
}

export function resumeSimulation({
  stateId,
  setIsPaused,
  controller = timeSystem,
  fetchImpl = fetch,
}: SimulationControlOptions): void {
  controller.setSpeed(TIME_SPEEDS.NORMAL);
  setIsPaused(false);

  if (!stateId) return;

  void fetchImpl('/api/state', {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      id: stateId,
      auto_ticking: true,
      last_tick_at: new Date().toISOString(),
    }),
  });
}
