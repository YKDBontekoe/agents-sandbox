import React from 'react';
import type { GameResources, WorkforceInfo } from './types';

interface Props {
  resources: GameResources;
  workforce: WorkforceInfo;
  changes: Partial<Record<keyof GameResources, number | null>>;
  shortages?: Partial<Record<keyof GameResources, number>>;
}

function ResourceItem({ label, value, delta, danger }: { label: string; value: number; delta?: number | null; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-1 rounded hover:bg-white/40">
      <div className="text-slate-700 font-medium">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <span className={`tabular-nums ${danger ? 'text-red-700' : 'text-slate-800'}`}>{value}</span>
        {typeof delta === 'number' && delta !== 0 && (
          <span className={`text-xs tabular-nums ${delta > 0 ? 'text-green-700' : 'text-red-700'}`}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
    </div>
  );
}

export function ResourcePanel({ resources, workforce, changes, shortages }: Props) {
  return (
    <section aria-label="Resources" className="bg-white/80 backdrop-blur rounded-md border border-slate-200 p-2 w-72 text-sm select-none">
      <header className="px-2 py-1 text-xs uppercase tracking-wide text-slate-500">Resources</header>
      <div className="space-y-1">
        <ResourceItem label="Grain" value={resources.grain} delta={changes.grain} danger={!!shortages?.grain} />
        <ResourceItem label="Coin" value={resources.coin} delta={changes.coin} danger={!!shortages?.coin} />
        <ResourceItem label="Mana" value={resources.mana} delta={changes.mana} danger={!!shortages?.mana} />
        <ResourceItem label="Favor" value={resources.favor} delta={changes.favor} danger={!!shortages?.favor} />
        <ResourceItem label="Unrest" value={resources.unrest} delta={changes.unrest} danger={resources.unrest >= 80} />
        <ResourceItem label="Threat" value={resources.threat} delta={changes.threat} danger={resources.threat >= 70} />
      </div>
      <footer className="mt-2 border-t pt-2 px-2 text-slate-600 grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs">Workforce</div>
          <div className="tabular-nums">{workforce.idle}/{workforce.total} idle</div>
        </div>
        <div>
          <div className="text-xs">Needed</div>
          <div className="tabular-nums">{workforce.needed}</div>
        </div>
      </footer>
    </section>
  );
}