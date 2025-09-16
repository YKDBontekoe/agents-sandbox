import { describe, expect, it, vi } from 'vitest';
import { TIME_SPEEDS } from '@engine';
import { pauseSimulation, resumeSimulation } from '../simulationControls';

describe('simulationControls', () => {
  it('pauses the simulation and updates Supabase when a state id is present', () => {
    const setIsPaused = vi.fn();
    const controller = { setSpeed: vi.fn() };
    const fetchImpl = vi.fn();

    pauseSimulation({
      stateId: 'state-123',
      setIsPaused,
      controller,
      fetchImpl,
    });

    expect(controller.setSpeed).toHaveBeenCalledWith(TIME_SPEEDS.PAUSED);
    expect(setIsPaused).toHaveBeenCalledWith(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/state');
    expect(init).toMatchObject({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });

    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({ id: 'state-123', auto_ticking: false });
  });

  it('does not patch Supabase when pausing without a state id', () => {
    const setIsPaused = vi.fn();
    const controller = { setSpeed: vi.fn() };
    const fetchImpl = vi.fn();

    pauseSimulation({ setIsPaused, controller, fetchImpl });

    expect(controller.setSpeed).toHaveBeenCalledWith(TIME_SPEEDS.PAUSED);
    expect(setIsPaused).toHaveBeenCalledWith(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('resumes the simulation and updates Supabase when a state id is present', () => {
    const setIsPaused = vi.fn();
    const controller = { setSpeed: vi.fn() };
    const fetchImpl = vi.fn();

    resumeSimulation({
      stateId: 'state-456',
      setIsPaused,
      controller,
      fetchImpl,
    });

    expect(controller.setSpeed).toHaveBeenCalledWith(TIME_SPEEDS.NORMAL);
    expect(setIsPaused).toHaveBeenCalledWith(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/state');
    expect(init).toMatchObject({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });

    const body = JSON.parse(String(init?.body));
    expect(body.id).toBe('state-456');
    expect(body.auto_ticking).toBe(true);
    expect(typeof body.last_tick_at).toBe('string');
    expect(new Date(body.last_tick_at).toString()).not.toBe('Invalid Date');
  });

  it('does not patch Supabase when resuming without a state id', () => {
    const setIsPaused = vi.fn();
    const controller = { setSpeed: vi.fn() };
    const fetchImpl = vi.fn();

    resumeSimulation({ setIsPaused, controller, fetchImpl });

    expect(controller.setSpeed).toHaveBeenCalledWith(TIME_SPEEDS.NORMAL);
    expect(setIsPaused).toHaveBeenCalledWith(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
