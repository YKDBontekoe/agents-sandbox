import React from 'react';
import { SIM_BUILDINGS } from './simCatalog';

type WorkerBuilding = {
  id: string;
  typeId: keyof typeof SIM_BUILDINGS;
  workers: number;
};

interface WorkerPanelProps {
  buildings: WorkerBuilding[];
  catalog: typeof SIM_BUILDINGS;
  idleWorkers: number;
  onAssign: (id: string) => void;
  onUnassign: (id: string) => void;
  anchor?: 'left' | 'right';
}

const WorkerPanel: React.FC<WorkerPanelProps> = ({
  buildings,
  catalog,
  idleWorkers,
  onAssign,
  onUnassign,
  anchor = 'right'
}) => {
  const sideClass = anchor === 'right' ? 'right-2' : 'left-2';
  return (
    <div className={`absolute ${sideClass} bottom-24 bg-panel backdrop-blur-md border border-border p-3 rounded-lg shadow-lg pointer-events-auto z-40`}
      style={{ width: '14rem' }}
    >
      <h3 className="text-xs font-semibold mb-2 text-foreground">
        Workers: {idleWorkers} idle
      </h3>
      <div className="space-y-2">
        {buildings.map(b => {
          const def = catalog[b.typeId];
          const cap = def.workCapacity ?? 0;
          return (
            <div key={b.id} className="flex items-center justify-between text-xs">
              <span className="text-foreground mr-2 truncate">{def.name}</span>
              <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                <button
                  onClick={() => onUnassign(b.id)}
                  disabled={b.workers <= 0}
                  className="px-2 py-0.5 border border-border rounded disabled:opacity-50"
                >
                  -
                </button>
                <span className="font-mono">
                  {b.workers}/{cap}
                </span>
                <button
                  onClick={() => onAssign(b.id)}
                  disabled={idleWorkers <= 0 || b.workers >= cap}
                  className="px-2 py-0.5 border border-border rounded disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
        {buildings.length === 0 && (
          <div className="text-muted text-xs">No buildings</div>
        )}
      </div>
    </div>
  );
};

export default WorkerPanel;
