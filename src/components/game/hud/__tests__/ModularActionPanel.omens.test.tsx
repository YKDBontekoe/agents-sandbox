import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ModularActionPanel } from '../panels/ModularActionPanel';
import { OmenPanel } from '@/components/game/OmenPanel';
import type { SeasonalEvent, OmenReading } from '@/components/game/omen/types';

vi.mock('@arcane/ui/responsive', () => {
  return {
    ResponsivePanel: ({ children, title }: any) => (
      <section aria-label={title}>{children}</section>
    ),
    ResponsiveButton: ({ children, onClick, disabled }: any) => (
      <button type="button" onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    ResponsiveStack: ({ children }: any) => <div>{children}</div>,
    ResponsiveIcon: ({ children }: any) => <span>{children}</span>,
  };
});

vi.mock('../HUDPanelRegistry', () => ({
  useHUDPanel: () => undefined,
}));

vi.mock('../HUDLayoutSystem', () => ({
  useHUDLayout: () => ({ screenSize: 'desktop' }),
}));

const sampleEvents: SeasonalEvent[] = [
  {
    id: 'evt-1',
    name: 'Eclipse of Glass',
    description: 'A shimmering dome fractures above the council.',
    type: 'crisis',
    season: 'summer',
    cycleOffset: 2,
    probability: 82,
    duration: 3,
    effects: [{ resource: 'Mana', impact: '-5' }],
    isRevealed: true,
  },
  {
    id: 'evt-2',
    name: 'Harvest Bloom',
    description: 'Aurora light dances over the orchards.',
    type: 'blessing',
    season: 'autumn',
    cycleOffset: 4,
    probability: 68,
    duration: 2,
    effects: [{ resource: 'Grain', impact: '+6' }],
    isRevealed: false,
  },
];

const sampleReadings: OmenReading[] = [
  {
    id: 'reading-1',
    title: 'Leyline Chorus',
    description: 'Mana threads hum in harmony.',
    confidence: 72,
    revealedAt: 11,
    events: ['evt-2'],
  },
];

function Harness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <ModularActionPanel
        onOpenCouncil={vi.fn()}
        onOpenEdicts={vi.fn()}
        onOpenOmens={() => setIsOpen(true)}
        onOpenSettings={vi.fn()}
        onToggleLeylineDrawing={vi.fn()}
        intervalMs={60000}
      />
      <OmenPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        upcomingEvents={sampleEvents}
        omenReadings={sampleReadings}
        currentCycle={12}
        currentSeason="spring"
        onRequestReading={vi.fn()}
        canRequestReading
        readingCost={10}
        currentMana={50}
      />
    </div>
  );
}

describe('ModularActionPanel omens integration', () => {
  it('opens the omen panel when the Omens button is clicked', async () => {
    render(<Harness />);

    expect(screen.queryByText(/Omen Readings/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Omens/i }));

    expect(await screen.findByText(/Omen Readings/i)).not.toBeNull();
    expect(screen.getAllByText('Eclipse of Glass').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Leyline Chorus').length).toBeGreaterThan(0);
  });
});

