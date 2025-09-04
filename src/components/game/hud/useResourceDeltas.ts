import { useEffect, useRef, useState } from 'react';
import type { GameResources } from './types';

export function useResourceDeltas(resources: GameResources, significantThreshold = 10) {
  const prevRef = useRef<GameResources>(resources);
  const [changes, setChanges] = useState<Record<keyof GameResources, number | null>>({
    grain: null,
    wood: null,
    planks: null,
    coin: null,
    mana: null,
    favor: null,
    unrest: null,
    threat: null,
  });
  const [significant, setSignificant] = useState<Array<{ key: keyof GameResources; delta: number }>>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const newSignificant: Array<{ key: keyof GameResources; delta: number }> = [];

    (Object.keys(resources) as (keyof GameResources)[]).forEach((key) => {
      const prev = prevRef.current[key];
      const curr = resources[key];
      if (prev !== curr) {
        const delta = curr - prev;
        setChanges((c) => ({ ...c, [key]: delta }));
        if (Math.abs(delta) >= significantThreshold) {
          newSignificant.push({ key, delta });
        }
        timers.push(
          setTimeout(() => setChanges((c) => ({ ...c, [key]: null })), 1500)
        );
      }
    });

    if (newSignificant.length) setSignificant(newSignificant);

    prevRef.current = resources;
    return () => timers.forEach(clearTimeout);
  }, [resources, significantThreshold]);

  return { changes, significant } as const;
}
