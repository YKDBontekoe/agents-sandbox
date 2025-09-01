'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface GameStateRow {
  cycle: number;
}

export function useBestCycle(cycle: number) {
  const [bestCycle, setBestCycle] = useState<number>(cycle);

  useEffect(() => {
    let isMounted = true;
    const loadBest = async () => {
      let localBest = cycle;
      try {
        const stored = localStorage.getItem('ad_best_cycle');
        if (stored) localBest = Math.max(localBest, parseInt(stored, 10));
      } catch {}

      let remoteBest = 0;
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase
          .from<GameStateRow>('game_state')
          .select('cycle')
          .order('cycle', { ascending: false })
          .limit(1);
        if (data && data.length > 0) remoteBest = data[0].cycle;
      } catch {}

      const best = Math.max(localBest, remoteBest);
      if (isMounted) setBestCycle(best);
      try { localStorage.setItem('ad_best_cycle', String(best)); } catch {}
    };
    loadBest();
    return () => { isMounted = false; };
  }, [cycle]);

  useEffect(() => {
    if (cycle > bestCycle) {
      setBestCycle(cycle);
      try { localStorage.setItem('ad_best_cycle', String(cycle)); } catch {}
    }
  }, [cycle, bestCycle]);

  return bestCycle;
}

