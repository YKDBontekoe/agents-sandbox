import React from 'react';
import {
  SIM_BUILDINGS,
  BUILDABLE_TILES,
  BUILD_MENU_GROUPS,
  type BuildTypeId,
  type BuildingAvailability,
} from '../simCatalog';
import { canAfford, type SimResources } from '../resourceUtils';

interface StoredBuilding {
  id: string;
  typeId: BuildTypeId;
  x: number;
  y: number;
  level: number;
  workers: number;
  traits?: { waterAdj?: number; mountainAdj?: number; forestAdj?: number };
  recipe?: 'basic' | 'fine' | 'premium';
}

interface TradeRoute {
  id: string;
  fromId: string;
  toId: string;
  length: number;
}

export interface TileInfoPanelProps {
  selected: { x: number; y: number; tileType?: string };
  simResources: SimResources | null;
  placedBuildings: StoredBuilding[];
  routes: TradeRoute[];
  onPreviewType: (typeId: BuildTypeId | null) => void;
  onBuild: (typeId: BuildTypeId) => void | Promise<void>;
  onUpgrade: (buildingId: string) => void | Promise<void>;
  onDismantle: (buildingId: string) => void | Promise<void>;
  onRemoveRoute: (routeId: string) => void | Promise<void>;
  routeDraftFrom: string | null;
  onStartRoute: (buildingId: string) => void;
  onFinalizeRoute: (fromId: string, toId: string) => void;
  onCancelRoute: () => void;
  onOpenCouncil: () => void;
  tutorialFree: Partial<Record<BuildTypeId, number>>;
  onConsumeTutorialFree: (typeId: BuildTypeId) => void;
  onTutorialProgress: (evt: { type: 'built' | 'openedCouncil' }) => void;
  allowFineSawmill: boolean;
  onSetRecipe: (buildingId: string, recipe: 'basic' | 'fine' | 'premium') => void;
  buildingAvailability: Record<BuildTypeId, BuildingAvailability>;
}

const TileInfoPanel: React.FC<TileInfoPanelProps> = ({
  selected,
  simResources,
  placedBuildings,
  routes,
  onPreviewType,
  onBuild,
  onUpgrade,
  onDismantle,
  onRemoveRoute,
  routeDraftFrom,
  onStartRoute,
  onFinalizeRoute,
  onCancelRoute,
  onOpenCouncil,
  tutorialFree,
  onConsumeTutorialFree,
  onTutorialProgress,
  allowFineSawmill,
  onSetRecipe,
  buildingAvailability,
}) => {
  const { x, y, tileType } = selected;
  const occupied = placedBuildings.find(b => b.x === x && b.y === y) || null;
  const hasCouncil = placedBuildings.some(b => b.typeId === 'council_hall');

  const canPlaceOnTile = (typeId: BuildTypeId) => {
      const allowed = (BUILDABLE_TILES as Record<string, string[]>)[typeId];
    if (!allowed) return true;
    if (!tileType) return false;
    return allowed.includes(tileType);
  };

  const canAffordBuild = (typeId: BuildTypeId, allowWhenFree: boolean) => {
    if (!simResources) return false;
    if (allowWhenFree && (tutorialFree[typeId] || 0) > 0) return true;
    return canAfford(SIM_BUILDINGS[typeId].cost, simResources);
  };

  const renderCost = (typeId: BuildTypeId) => {
    const cost = SIM_BUILDINGS[typeId].cost;
      const parts = Object.entries(cost)
        .filter(([, v]) => (v ?? 0) > 0)
        .map(([k, v]) => `${k} -${v}`);
    return parts.length ? parts.join('  ') : 'Free';
  };

  const renderRequirements = (availability: BuildingAvailability) => {
    if (!availability.requirementSummaries.length) return null;
    return (
      <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
        {availability.requirementSummaries.map(req => (
          <li key={req} className="flex items-start gap-1">
            <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
            <span>{req}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderLockedReasons = (reasons: string[]) => {
    if (!reasons.length) return null;
    return (
      <div className="mt-1 text-[11px] text-rose-500">
        <div className="font-medium text-rose-600">Locked</div>
        <ul className="list-disc list-inside space-y-0.5">
          {reasons.map(reason => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    );
  };

  const buildGroups = BUILD_MENU_GROUPS.filter(group =>
    group.types.some(typeId => SIM_BUILDINGS[typeId as BuildTypeId]),
  );

  return (
    <div className="absolute bottom-56 left-4 bg-white/95 border border-slate-200 text-slate-800 px-3 py-2 rounded-md text-sm shadow-sm pointer-events-auto w-[320px]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-medium">Tile ({x}, {y})</div>
          <div className="text-xs text-slate-500">{tileType ?? 'unknown'}{occupied ? ` • ${SIM_BUILDINGS[occupied.typeId].name}` : ''}</div>
        </div>
        <button
          onClick={() => { onOpenCouncil(); onTutorialProgress({ type: 'openedCouncil' }); }}
          className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs"
        >
          Open Council
        </button>
      </div>

      <div className="mt-2 border-t pt-2">
        {occupied ? (
          <div className="space-y-2">
            <div className="text-xs text-slate-600">
              {SIM_BUILDINGS[occupied.typeId].name} • Lv.{occupied.level}
            </div>
            <div className="text-xs text-slate-500">
              Workers: {occupied.workers}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => onUpgrade(occupied.id)} className="px-2 py-1 text-xs rounded bg-amber-600 hover:bg-amber-700 text-white">Upgrade</button>
              <button onClick={() => onDismantle(occupied.id)} className="px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300 text-slate-700">Dismantle</button>
            </div>
            {occupied.typeId === 'sawmill' && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-slate-600">Recipe:</span>
                <button
                  onClick={() => onSetRecipe(occupied.id, 'basic')}
                  className={`px-2 py-0.5 rounded border ${(occupied.recipe ?? 'basic') === 'basic' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-700 border-slate-300'}`}
                >
                  Planks
                </button>
                <button
                  onClick={() => allowFineSawmill && onSetRecipe(occupied.id, 'fine')}
                  disabled={!allowFineSawmill}
                  className={`px-2 py-0.5 rounded border ${(occupied.recipe) === 'fine' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-700 border-slate-300'} ${!allowFineSawmill ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={allowFineSawmill ? 'Fine Planks (wood 4 → planks 9)' : 'Requires relevant skill'}
                >
                  Fine Planks
                </button>
              </div>
            )}
            {occupied.typeId === 'trade_post' && (
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-600">Trade Mode:</span>
                  <button
                    onClick={() => onSetRecipe(occupied.id, 'basic')}
                    className={`px-2 py-0.5 rounded border ${(occupied.recipe ?? 'basic') === 'basic' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-700 border-slate-300'}`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => onSetRecipe(occupied.id, 'premium')}
                    className={`px-2 py-0.5 rounded border ${(occupied.recipe === 'premium') ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-700 border-slate-300'}`}
                    title={'Premium Goods (grain 3 → coin 12)'}
                  >
                    Premium
                  </button>
                </div>
                {routeDraftFrom === null && (
                  <button onClick={() => onStartRoute(occupied.id)} className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white">Create Trade Route</button>
                )}
                {routeDraftFrom && routeDraftFrom === occupied.id && (
                  <button onClick={onCancelRoute} className="px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300 text-slate-700">Cancel</button>
                )}
                {routeDraftFrom && routeDraftFrom !== occupied.id && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => onFinalizeRoute(routeDraftFrom, occupied.id)} className="px-2 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white">Connect Route Here</button>
                    <span className="text-[11px] text-slate-500">
                      {(() => {
                        const from = placedBuildings.find(b => b.id === routeDraftFrom);
                        if (!from) return null;
                        const length = Math.abs(from.x - occupied.x) + Math.abs(from.y - occupied.y);
                        const cost = 5 + 2 * length;
                        return `Cost: coin ${cost} (len ${length})`;
                      })()}
                    </span>
                  </div>
                )}
                {(() => {
                  const connected = (routes || []).filter(r => r.fromId === occupied.id || r.toId === occupied.id);
                  if (connected.length === 0) return null;
                  return (
                    <div className="text-[11px] text-slate-600">
                      Routes:
                      <ul className="mt-1 space-y-1">
                        {connected.map(r => {
                          const otherId = r.fromId === occupied.id ? r.toId : r.fromId;
                          const other = placedBuildings.find(b => b.id === otherId);
                          return (
                            <li key={r.id} className="flex items-center gap-2">
                              <span>→ {other ? SIM_BUILDINGS[other.typeId].name : otherId} (len {r.length})</span>
                              <button
                                className="px-2 py-0.5 text-[11px] rounded bg-red-600 hover:bg-red-700 text-white"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await onRemoveRoute(r.id);
                                }}
                              >Remove</button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {buildGroups.map(group => (
              <div key={group.id} className="border border-slate-200 rounded-md p-2">
                <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">{group.label}</div>
                <div className="space-y-2">
                  {group.types.map(typeId => {
                    const def = SIM_BUILDINGS[typeId];
                    if (!def) return null;
                    const placeable = canPlaceOnTile(typeId);
                    const availability = buildingAvailability[typeId];
                    const locked = availability ? !availability.meetsPrerequisites : false;
                    const tutorialAllowance = tutorialFree[typeId] || 0;
                    const affordable = canAffordBuild(typeId, !locked);
                    const disabled = locked || !placeable || (!affordable && tutorialAllowance <= 0);
                    const reasons = locked ? availability?.reasons ?? [] : [];
                    const requirementList = availability ? renderRequirements(availability) : null;
                    return (
                      <div
                        key={typeId}
                        className={`rounded border px-2 py-1.5 ${disabled ? 'border-slate-200 bg-slate-50' : 'border-slate-300 bg-white'} shadow-sm`}
                        onMouseEnter={() => onPreviewType(typeId)}
                        onMouseLeave={() => onPreviewType(null)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium text-slate-800 text-sm flex items-center gap-2">
                              {def.name}
                              {def.unique && (
                                <span className="text-[10px] uppercase tracking-wide text-indigo-600 bg-indigo-100 border border-indigo-200 px-1 py-0.5 rounded">
                                  Unique
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {renderCost(typeId)}{!placeable ? ' • invalid terrain' : ''}{tutorialAllowance > 0 ? ` • ${tutorialAllowance} free` : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (disabled) return;
                              onBuild(typeId);
                              if (tutorialAllowance > 0) onConsumeTutorialFree(typeId);
                              onTutorialProgress({ type: 'built' });
                            }}
                            disabled={disabled}
                            className={`px-2 py-1 rounded text-xs border ${disabled ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'}`}
                          >
                            Build
                          </button>
                        </div>
                        {requirementList}
                        {renderLockedReasons(reasons)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TileInfoPanel;

