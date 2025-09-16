'use client';

import React, { useMemo } from 'react';
import type { CivilizationSummary, DiplomaticActionKind } from '@engine/simulation/world/civilizations';

interface DiplomaticPanelProps {
  civilizations: CivilizationSummary[];
  onAction: (targetId: string, action: DiplomaticActionKind) => void | Promise<void>;
  busy?: boolean;
}

const PLAYER_REALM_ID = 'arcane-dominion' as const;

function statusClass(status: CivilizationSummary['relationship']['status']) {
  switch (status) {
    case 'ally':
    case 'self':
      return 'text-emerald-300';
    case 'friendly':
      return 'text-emerald-200';
    case 'neutral':
      return 'text-slate-200';
    case 'wary':
      return 'text-amber-300';
    case 'hostile':
      return 'text-rose-300';
    default:
      return 'text-slate-300';
  }
}

function trendSymbol(trend: CivilizationSummary['relationship']['trend']) {
  if (trend === 'improving') return '↑';
  if (trend === 'declining') return '↓';
  return '→';
}

function formatTemperament(value: CivilizationSummary['temperament']) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const actionButtons: Array<{ label: string; action: DiplomaticActionKind; tone: string; description: string }> = [
  { label: 'Send Aid', action: 'gift', tone: 'bg-emerald-600 hover:bg-emerald-500', description: 'Bolster relations with a tribute.' },
  { label: 'Forge Pact', action: 'forge_pact', tone: 'bg-indigo-600 hover:bg-indigo-500', description: 'Propose a mutual defense accord.' },
  { label: 'Issue Warning', action: 'threaten', tone: 'bg-rose-700 hover:bg-rose-600', description: 'Exert pressure through veiled threats.' },
];

const DiplomaticPanel: React.FC<DiplomaticPanelProps> = ({ civilizations, onAction, busy = false }) => {
  const { playerRealm, neighbors } = useMemo(() => {
    const player = civilizations.find(c => c.id === PLAYER_REALM_ID) ?? null;
    const others = civilizations
      .filter(c => c.id !== PLAYER_REALM_ID)
      .sort((a, b) => b.relationship.attitude - a.relationship.attitude);
    return { playerRealm: player, neighbors: others };
  }, [civilizations]);

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900/70 p-4 text-slate-200 shadow-md">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Diplomatic Ledger</h3>
          <p className="text-xs text-slate-400">Monitor treaties and sway neighboring realms.</p>
        </div>
        {busy && <span className="text-xs text-amber-300">Resolving...</span>}
      </header>

      {playerRealm && (
        <div className="mb-3 rounded-md border border-slate-700 bg-slate-900/60 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Arcane Dominion</div>
          <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div>Temperament: <span className="text-slate-100">{formatTemperament(playerRealm.temperament)}</span></div>
            <div>Influence: <span className="text-slate-100">{playerRealm.resources.influence}</span></div>
            <div>Mana: <span className="text-slate-100">{playerRealm.resources.mana}</span></div>
            <div>Favor: <span className="text-slate-100">{playerRealm.resources.favor}</span></div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {neighbors.length === 0 && (
          <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">
            No neighboring civilizations have been encountered yet.
          </div>
        )}
        {neighbors.map((civ) => {
          const rel = civ.relationship;
          const statusLabel = rel.status === 'self'
            ? 'Dominion'
            : rel.status.charAt(0).toUpperCase() + rel.status.slice(1);
          const attitude = rel.attitude;
          const trend = trendSymbol(rel.trend);
          const influence = Math.round(civ.resources.influence);
          return (
            <article key={civ.id} className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">{civ.name}</h4>
                  <p className="text-xs text-slate-400">{formatTemperament(civ.temperament)} • Influence {influence}</p>
                </div>
                <div className={`text-right text-xs font-semibold ${statusClass(rel.status)}`}>
                  <div>{statusLabel}</div>
                  <div>{trend} {attitude}</div>
                </div>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-300">
                <div>
                  <dt className="text-slate-500">Coin reserves</dt>
                  <dd className="text-slate-200">{civ.resources.coin}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Favor stock</dt>
                  <dd className="text-slate-200">{civ.resources.favor}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Mana stores</dt>
                  <dd className="text-slate-200">{civ.resources.mana}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Treaties</dt>
                  <dd className="text-slate-200">{civ.treaties.length > 0 ? civ.treaties.length : 'None'}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {actionButtons.map(btn => (
                  <button
                    key={`${civ.id}-${btn.action}`}
                    type="button"
                    className={`rounded px-2.5 py-1 text-xs font-semibold text-white transition ${btn.tone} disabled:cursor-not-allowed disabled:opacity-60`}
                    onClick={() => onAction(civ.id, btn.action)}
                    disabled={busy}
                    title={btn.description}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default DiplomaticPanel;
