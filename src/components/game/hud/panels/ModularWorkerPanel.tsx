import React, { useRef, useState, useEffect } from 'react';
import { ResponsivePanel, ResponsiveText } from '../ResponsiveHUDPanels';
import { useHUDPanel } from '../HUDPanelRegistry';
import { SIM_BUILDINGS } from '@/components/game/simCatalog';
import type { SimResources } from '@/components/game/resourceUtils';

type WorkerBuilding = {
  id: string;
  typeId: keyof typeof SIM_BUILDINGS;
  workers: number;
  level?: number;
};

interface ModularWorkerPanelProps {
  buildings: WorkerBuilding[];
  idleWorkers: number;
  onAssign: (id: string) => void;
  onUnassign: (id: string) => void;
  unrest?: number;
  totalWorkers?: number;
  grain?: number;
  variant?: 'default' | 'compact' | 'minimal';
  collapsible?: boolean;
}

export default function ModularWorkerPanel({ buildings, idleWorkers, onAssign, onUnassign, unrest = 0, totalWorkers = 0, grain = 0, variant = 'default', collapsible = true }: ModularWorkerPanelProps) {
  // Start collapsed by default to keep sidebar tidy; user can expand
  const [isCollapsed, setIsCollapsed] = useState(true);
  const prevIdleRef = useRef(idleWorkers);
  const collapseTimerRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Auto-expand when new idle workers become available
  useEffect(() => {
    if (idleWorkers > prevIdleRef.current) {
      setIsCollapsed(false);
    }
    prevIdleRef.current = idleWorkers;
  }, [idleWorkers]);

  const scheduleCollapse = () => {
    if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = window.setTimeout(() => setIsCollapsed(true), 1600);
  };

  // Smoothly bring the panel into view when expanded
  useEffect(() => {
    if (!isCollapsed && panelRef.current) {
      try { panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch {}
    }
  }, [isCollapsed]);

  // Auto-assign distribution: fill highest-need buildings first
  const handleAutoAssign = () => {
    if (idleWorkers <= 0) return;
    // Local simulation of distribution
    const local: { id: string; need: number }[] = buildings.map(b => {
      const cap = SIM_BUILDINGS[b.typeId].workCapacity ?? 0;
      return { id: b.id, need: Math.max(0, cap - b.workers) };
    }).filter(x => x.need > 0);
    if (local.length === 0) return;
    let remaining = idleWorkers;
    // Greedy by need descending
    local.sort((a,b) => b.need - a.need);
    let i = 0;
    while (remaining > 0 && local.some(x => x.need > 0)) {
      const slot = local[i % local.length];
      if (slot.need > 0) {
        onAssign(slot.id);
        slot.need -= 1;
        remaining -= 1;
      }
      i++;
    }
    scheduleCollapse();
  };

  const predictPrimaryOutput = (b: WorkerBuilding & { level?: number }): { key: string; value: number } | null => {
    const def = SIM_BUILDINGS[b.typeId];
    if (!def) return null;
    const outputs = def.outputs || {} as Partial<SimResources>;
    const entries = Object.entries(outputs).filter(([_, v]) => (v ?? 0) > 0) as [keyof SimResources, number][];
    if (entries.length === 0) return null;
    // choose the largest base output key
    entries.sort((a,b)=> (b[1]||0) - (a[1]||0));
    const [key, base] = entries[0];
    const baseCap = def.workCapacity ?? 0;
    const level = Math.max(1, Number(b.level ?? 1));
    const cap = Math.round(baseCap * (1 + 0.25 * (level - 1)));
    const ratio = cap > 0 ? Math.min(1, (b.workers || 0) / cap) : 1;
    const levelOutScale = 1 + 0.5 * (level - 1);
    const value = Math.max(0, Math.round((base || 0) * ratio * levelOutScale));
    return { key: String(key), value };
  };

  useHUDPanel({
    config: {
      id: 'workers-panel',
      zone: 'sidebar-right',
      priority: 7,
      responsive: { hideOnMobile: true, collapseOnMobile: true },
      accessibility: { ariaLabel: 'Workers assignment panel', role: 'region' }
    },
    component: ModularWorkerPanel,
    props: { variant, collapsible }
  });

  const titleIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  return (
    <ResponsivePanel
      title={variant !== 'minimal' ? 'Workforce' : 'W'}
      icon={titleIcon}
      variant={variant}
      collapsible={collapsible}
      isCollapsed={isCollapsed}
      onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      priority="medium"
      actions={(
        <div className="flex items-center gap-1">
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none tabular-nums ${idleWorkers>0 ? 'bg-emerald-600 text-white animate-pulse' : 'bg-slate-200 text-slate-700'}`} title="Idle workers">{idleWorkers}</span>
          <button onClick={handleAutoAssign} className="px-1.5 py-0.5 text-[10px] rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-50" disabled={idleWorkers <= 0} title="Auto-assign idle workers across buildings">Auto</button>
        </div>
      )}
      className="min-w-0"
      ref={panelRef as any}
    >
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-2">
          <span className="text-slate-600">Idle</span>
          <span className="font-mono text-slate-800">{idleWorkers}</span>
        </div>
        {(() => {
          const moraleScore = Math.max(0, 100 - unrest * 7 - Math.max(0, (totalWorkers * 0.2) - Math.max(0, grain)) * 1);
          const status = moraleScore >= 70 ? 'Stable' : moraleScore >= 40 ? 'Concerned' : 'Restless';
          const cls = status === 'Stable' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : status === 'Concerned' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-rose-100 text-rose-800 border-rose-200';
          return (
            <span className={`px-2 py-0.5 rounded-full border ${cls}`} title={`Unrest ${unrest}`}>Morale: {status}</span>
          );
        })()}
      </div>
      <div className="text-[10px] text-slate-500 mb-2">Upkeep ~{Math.round((totalWorkers || 0) * 0.2)} grain / cycle</div>
      <div className="space-y-2">
        {buildings.length === 0 && (
          <ResponsiveText size={{ mobile: 'xs', tablet: 'xs', desktop: 'sm', wide: 'sm' }} color="muted">No buildings</ResponsiveText>
        )}
        {buildings.map(b => {
          const def = SIM_BUILDINGS[b.typeId];
          const baseCap = def.workCapacity ?? 0;
          const level = Math.max(1, Number(b.level ?? 1));
          const cap = Math.round(baseCap * (1 + 0.25 * (level - 1)));
          const ratio = cap > 0 ? Math.min(1, (b.workers || 0) / cap) : 0;
          const pred = predictPrimaryOutput(b);
          return (
            <div key={b.id} className="flex items-center justify-between text-xs">
              <div className="flex-1 min-w-0 mr-2" title={`Workers ${b.workers}/${cap} (Lv.${level})`}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-800 truncate mr-2">{def.name}</span>
                  <span className="font-mono text-[10px] text-slate-600">Lv.{level}</span>
                </div>
                {cap > 0 && (
                  <div className="mt-1 h-1.5 bg-slate-200 rounded" aria-label="Efficiency">
                    <div className="h-1.5 rounded" style={{ width: `${ratio * 100}%`, background: ratio >= 1 ? '#059669' : '#10b981' }} />
                  </div>
                )}
                <div className="mt-1 text-[10px] text-slate-500">
                  {pred ? (<span>≈ +{pred.value} {pred.key}</span>) : (<span className="opacity-60">—</span>)}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => { onUnassign(b.id); scheduleCollapse(); }}
                  disabled={b.workers <= 0}
                  className="px-2 py-0.5 border border-slate-300 rounded disabled:opacity-50"
                >-
                </button>
                <span className="font-mono">{b.workers}/{cap}</span>
                <button
                  onClick={() => { onAssign(b.id); scheduleCollapse(); }}
                  disabled={idleWorkers <= 0 || b.workers >= cap}
                  className="px-2 py-0.5 border border-slate-300 rounded disabled:opacity-50"
                >+
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ResponsivePanel>
  );
}

export type { ModularWorkerPanelProps };
