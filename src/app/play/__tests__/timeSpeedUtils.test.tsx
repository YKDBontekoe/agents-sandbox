// @vitest-environment jsdom

import React, { act } from 'react';
import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import ModularActionPanel from '../../../components/game/hud/panels/ModularActionPanel';
import { HUDLayoutProvider } from '../../../components/game/hud/HUDLayoutSystem';
import { HUDPanelRegistryProvider } from '../../../components/game/hud/HUDPanelRegistry';
import { intervalMsToTimeSpeed, sanitizeIntervalMs, timeSpeedToIntervalMs } from '../timeSpeedUtils';
import { TIME_SPEEDS } from '@engine';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const originalInnerWidth = window.innerWidth;
const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

beforeAll(() => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: 1440,
  });

  if (!globalThis.requestAnimationFrame) {
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 0) as unknown as number;
    }) as typeof globalThis.requestAnimationFrame;
  }

  if (!globalThis.cancelAnimationFrame) {
    globalThis.cancelAnimationFrame = ((id: number) => {
      clearTimeout(id);
    }) as typeof globalThis.cancelAnimationFrame;
  }
});

afterAll(() => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: originalInnerWidth,
  });

  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    writable: true,
    value: originalRequestAnimationFrame,
  });

  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    writable: true,
    value: originalCancelAnimationFrame,
  });
});

describe('timeSpeedUtils', () => {
  it('sanitizes interval milliseconds from various inputs', () => {
    expect(sanitizeIntervalMs(60000.4)).toBe(60000);
    expect(sanitizeIntervalMs('45000')).toBe(45000);
    expect(sanitizeIntervalMs(0)).toBeNull();
    expect(sanitizeIntervalMs(-10)).toBeNull();
    expect(sanitizeIntervalMs(Number.NaN)).toBeNull();
  });

  it('maps intervals to the nearest TimeSpeed tier', () => {
    expect(intervalMsToTimeSpeed(120000)).toBe(TIME_SPEEDS.NORMAL);
    expect(intervalMsToTimeSpeed(60000)).toBe(TIME_SPEEDS.NORMAL);
    expect(intervalMsToTimeSpeed(30000)).toBe(TIME_SPEEDS.FAST);
    expect(intervalMsToTimeSpeed(15000)).toBe(TIME_SPEEDS.VERY_FAST);
    expect(intervalMsToTimeSpeed(7000)).toBe(TIME_SPEEDS.ULTRA_FAST);
    expect(intervalMsToTimeSpeed(2000)).toBe(TIME_SPEEDS.HYPER_SPEED);
    expect(intervalMsToTimeSpeed(-1)).toBe(TIME_SPEEDS.NORMAL);
  });

  it('maps TimeSpeed tiers to canonical intervals', () => {
    expect(timeSpeedToIntervalMs(TIME_SPEEDS.PAUSED)).toBe(60000);
    expect(timeSpeedToIntervalMs(TIME_SPEEDS.NORMAL)).toBe(60000);
    expect(timeSpeedToIntervalMs(TIME_SPEEDS.FAST)).toBe(30000);
    expect(timeSpeedToIntervalMs(TIME_SPEEDS.VERY_FAST)).toBe(15000);
    expect(timeSpeedToIntervalMs(TIME_SPEEDS.ULTRA_FAST)).toBe(7500);
    expect(timeSpeedToIntervalMs(TIME_SPEEDS.HYPER_SPEED)).toBe(3000);
  });
});

describe('ModularActionPanel speed controls', () => {
  let container: HTMLDivElement;
  let root: Root;
  let currentInterval = 60000;
  const recorded: number[] = [];

  const handleChange = (ms: number) => {
    recorded.push(ms);
    currentInterval = ms;
  };

  const renderPanel = () => {
    root.render(
      <HUDLayoutProvider layoutPreset="compact">
        <HUDPanelRegistryProvider>
          <ModularActionPanel intervalMs={currentInterval} onChangeIntervalMs={handleChange} />
        </HUDPanelRegistryProvider>
      </HUDLayoutProvider>,
    );
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    currentInterval = 60000;
    recorded.length = 0;
    act(renderPanel);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('cycles through all preset intervals when the speed chip is clicked', () => {
    const expected = [30000, 15000, 120000, 60000];

    for (let i = 0; i < expected.length; i += 1) {
      const chip = container.querySelector('button[aria-label="Cycle simulation speed"]');
      expect(chip).toBeTruthy();
      act(() => {
        chip!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      act(renderPanel);
    }

    expect(recorded).toEqual(expected);
  });
});
