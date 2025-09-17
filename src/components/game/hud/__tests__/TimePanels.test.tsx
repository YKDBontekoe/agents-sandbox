import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameTime } from '../types';

vi.mock('../HUDPanelRegistry', () => ({
  useHUDPanel: () => undefined,
}));

vi.mock('../HUDLayoutSystem', () => ({
  useHUDLayout: () => ({ screenSize: 'desktop' }),
}));

import { TimePanel } from '../TimePanel';
import { ModularTimePanel } from '../panels/ModularTimePanel';

afterEach(() => {
  cleanup();
});

const baseTime: GameTime = {
  cycle: 3,
  season: 'spring',
  timeRemaining: 90,
};

describe('TimePanel', () => {
  it('updates the displayed cycle when the game state changes', () => {
    const { rerender } = render(<TimePanel time={baseTime} />);

    const readCycle = () => {
      const label = screen.getByText('Cycle');
      const container = label.parentElement as HTMLElement;
      const value = container.lastElementChild as HTMLElement | null;
      if (!value) {
        throw new Error('Cycle value not found');
      }
      return value.textContent;
    };

    expect(readCycle()).toBe(String(baseTime.cycle));

    rerender(
      <TimePanel
        time={{
          ...baseTime,
          cycle: 8,
        }}
      />
    );

    expect(readCycle()).toBe('8');
  });

  it('reflects seasonal changes from the time system', () => {
    const { rerender } = render(<TimePanel time={baseTime} />);

    const readSeason = () => {
      const label = screen.getByText('Season');
      const container = label.parentElement as HTMLElement;
      const value = container.lastElementChild as HTMLElement | null;
      if (!value) {
        throw new Error('Season value not found');
      }
      return value.textContent;
    };

    expect(readSeason()).toBe(baseTime.season);

    rerender(
      <TimePanel
        time={{
          ...baseTime,
          season: 'autumn',
        }}
      />
    );

    expect(readSeason()).toBe('autumn');
  });
});

describe('ModularTimePanel', () => {
  const renderPanel = (time: GameTime) =>
    render(
      <ModularTimePanel
        time={time}
        isPaused={false}
        onPause={() => {}}
        onResume={() => {}}
        onAdvanceCycle={() => {}}
      />
    );

  const readDisplayValue = (label: string) => {
    const labelNodes = screen.getAllByText(label);
    const labelNode = labelNodes[labelNodes.length - 1];
    if (!labelNode) {
      throw new Error(`Label "${label}" not found`);
    }
    const container = labelNode.closest('div') as HTMLElement;
    const valueNode = container.querySelector('.tabular-nums') as HTMLElement;
    return valueNode.textContent;
  };

  it('renders the latest server-reported cycle', () => {
    const { rerender } = renderPanel(baseTime);

    expect(readDisplayValue('Cycle')).toBe(String(baseTime.cycle));

    rerender(
      <ModularTimePanel
        time={{
          ...baseTime,
          cycle: 12,
        }}
        isPaused={false}
        onPause={() => {}}
        onResume={() => {}}
        onAdvanceCycle={() => {}}
      />
    );

    expect(readDisplayValue('Cycle')).toBe('12');
  });

  it('shows the season provided by the time system as it advances', () => {
    const { rerender } = renderPanel(baseTime);

    expect(readDisplayValue('Season')).toBe(baseTime.season);

    rerender(
      <ModularTimePanel
        time={{
          ...baseTime,
          season: 'winter',
        }}
        isPaused={false}
        onPause={() => {}}
        onResume={() => {}}
        onAdvanceCycle={() => {}}
      />
    );

    expect(readDisplayValue('Season')).toBe('winter');
  });
});

