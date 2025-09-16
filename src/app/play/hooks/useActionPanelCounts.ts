import { useMemo } from 'react';
import type { OmenReading, Proposal } from '../types';

export interface ActionPanelCounts {
  pendingCouncil: number;
  pendingOmens: number;
}

export function useActionPanelCounts(proposals: Proposal[], omenReadings: OmenReading[]): ActionPanelCounts {
  const pendingCouncil = useMemo(
    () =>
      proposals.reduce(
        (count, proposal) => count + ((proposal.status ?? 'pending') === 'pending' ? 1 : 0),
        0
      ),
    [proposals]
  );

  const pendingOmens = useMemo(() => omenReadings.length, [omenReadings]);

  return {
    pendingCouncil,
    pendingOmens,
  };
}
