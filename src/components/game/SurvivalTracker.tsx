'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface SurvivalTrackerProps {
  cycle: number;
  unrest: number;
  threat: number;
}

export default function SurvivalTracker({ cycle, unrest, threat }: SurvivalTrackerProps) {
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
          .from('game_state')
          .select('cycle')
          .order('cycle', { ascending: false })
          .limit(1);
        if (data && data.length > 0) remoteBest = data[0].cycle as number;
      } catch {}

      const best = Math.max(localBest, remoteBest);
      if (isMounted) {
        setBestCycle(best);
      }
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

  const bar = (label: string, value: number) => {
    const pct = Math.max(0, Math.min(100, value));
    const level = value >= 90 ? 'danger' : value >= 70 ? 'warn' : 'safe';
    const base = 'h-2 rounded transition-all duration-300';
    const color =
      level === 'danger'
        ? 'bg-red-600 animate-pulse'
        : level === 'warn'
        ? 'bg-amber-500 animate-pulse'
        : 'bg-emerald-500';
    return (
      <div key={label}>
        <div className="flex justify-between text-xs text-slate-600 mb-1">
          <span>{label}</span>
          <span>{pct}</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded">
          <div className={`${base} ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-slate-900 font-semibold">Survival</h3>
        <div className="text-sm text-slate-700 font-medium">Cycle {cycle}</div>
      </div>
      <div className="text-xs text-slate-500 mb-3">Best: {bestCycle}</div>
      <div className="space-y-3">
        {bar('Unrest', unrest)}
        {bar('Threat', threat)}
      </div>
    </div>
  );
}

