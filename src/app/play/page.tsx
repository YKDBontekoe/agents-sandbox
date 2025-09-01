'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import GameRenderer from '@/components/game/GameRenderer';

import { GameHUD, GameResources, GameTime } from '@/components/game/GameHUD';
import { CouncilPanel, CouncilProposal } from '@/components/game/CouncilPanel';
import { EdictsPanel, EdictSetting } from '@/components/game/EdictsPanel';
import { OmenPanel, SeasonalEvent, OmenReading } from '@/components/game/OmenPanel';
import DistrictSprites, { District } from '@/components/game/DistrictSprites';
import { LeylineSystem, Leyline } from '@/components/game/LeylineSystem';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import EffectsLayer from '@/components/game/EffectsLayer';
import HeatLayer from '@/components/game/HeatLayer';
import MarkersLayer from '@/components/game/MarkersLayer';
import SurvivalTracker from '@/components/game/SurvivalTracker';
import FlavorEvent from '@/components/game/FlavorEvent';
import { FlavorEventDef, getRandomFlavorEvent } from '@/components/game/flavorEvents';
import CrisisModal, { CrisisData } from '@/components/game/CrisisModal';
import GoalBanner from '@/components/game/GoalBanner';
import { useIdGenerator } from '@/hooks/useIdGenerator';

interface GameState {
  id: string;
  cycle: number;
  resources: Record<string, number>;
}

interface Proposal {
  id: string;
  guild: string;
  title: string;
  description: string;
  status: "pending" | "accepted" | "rejected" | "applied";
  predicted_delta: Record<string, number>;
}

// Sim Mode types and catalog
type SimResourceKey = 'grain' | 'coin' | 'mana' | 'favor' | 'population';
interface SimResourcesLocal { grain: number; coin: number; mana: number; favor: number; population: number }
interface SimBuildingType { id: string; name: string; cost: Partial<SimResourcesLocal>; production: Partial<SimResourcesLocal> }
const SIM_BUILDINGS: Record<string, SimBuildingType> = {
  farm: { id: 'farm', name: 'Farm', cost: { coin: 20, grain: 0 }, production: { grain: 10 } },
  house: { id: 'house', name: 'House', cost: { coin: 30, grain: 10 }, production: { population: 5 } },
  shrine: { id: 'shrine', name: 'Shrine', cost: { coin: 25, mana: 5 }, production: { favor: 2 } },
};

export default function PlayPage() {
  const generateId = useIdGenerator();
  const [state, setState] = useState<GameState | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [guild, setGuild] = useState("Wardens");
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes per cycle
  const [crisis, setCrisis] = useState<CrisisData | null>(null);
  
  // Panel states
  const [isCouncilOpen, setIsCouncilOpen] = useState(false);
  const [isEdictsOpen, setIsEdictsOpen] = useState(false);
  const [isOmensOpen, setIsOmensOpen] = useState(false);
  const [dismissedGuide, setDismissedGuide] = useState(false);
  const [acceptedNotice, setAcceptedNotice] = useState<{ title: string; delta: Record<string, number> } | null>(null);
  const [markers, setMarkers] = useState<{ id: string; x: number; y: number; label?: string }[]>([]);
  const [flavorEvent, setFlavorEvent] = useState<FlavorEventDef | null>(null);
  // onboarding & guidance
  const [gameMode, setGameMode] = useState<'casual' | 'advanced'>('casual');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [guideProgress, setGuideProgress] = useState({ selectedTile: false, openedCouncil: false, generated: false, accepted: false, advanced: false });
  const [guideHint, setGuideHint] = useState<string | null>(null);
  
  // Sim Mode state
  const [isSimMode, setIsSimMode] = useState(false);
  const [simResources, setSimResources] = useState<SimResourcesLocal | null>(null);
  const [placedBuildings, setPlacedBuildings] = useState<Array<{ id: string; typeId: keyof typeof SIM_BUILDINGS; x: number; y: number; level: number }>>([]);
  const [selectedBuildType, setSelectedBuildType] = useState<keyof typeof SIM_BUILDINGS | null>(null);
  const simInitRef = useRef(false);

  // Game world state
  const [districts, setDistricts] = useState<District[]>([]);
  const [leylines, setLeylines] = useState<Leyline[]>([]);
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [selectedLeyline, setSelectedLeyline] = useState<Leyline | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const hasAutoOpenedCouncilRef = useRef(false);
  
  // Panels data (empty until backend features are implemented)
  const [edicts, setEdicts] = useState<EdictSetting[]>([]);
  const [pendingEdictChanges, setPendingEdictChanges] = useState<Record<string, number>>({});
  const [upcomingEvents, setUpcomingEvents] = useState<SeasonalEvent[]>([]);
  const [omenReadings, setOmenReadings] = useState<OmenReading[]>([]);

  // Initialize onboarding from localStorage
  useEffect(() => {
    try {
      const done = typeof window !== 'undefined' ? localStorage.getItem('ad_onboarding_done') : null;
      const mode = (typeof window !== 'undefined' ? localStorage.getItem('ad_game_mode') : null) as 'casual' | 'advanced' | null;
      const dismissed = typeof window !== 'undefined' ? localStorage.getItem('ad_dismissed_guide') === '1' : false;
      if (dismissed) setDismissedGuide(true);
      if (!done) {
        setShowOnboarding(true);
        setIsPaused(true);
      } else if (mode) {
        setGameMode(mode);
      }
    } catch {}
  }, []);

  // Initialize Sim resources from server state once
  useEffect(() => {
    if (state && !simInitRef.current) {
      setSimResources({
        grain: state.resources.grain || 0,
        coin: state.resources.coin || 0,
        mana: state.resources.mana || 0,
        favor: state.resources.favor || 0,
        population: 0,
      });
      simInitRef.current = true;
    }
  }, [state]);
  const fetchState = useCallback(async () => {
    console.log('Fetching state from /api/state');
    const res = await fetch("/api/state");
    console.log('Response status:', res.status, res.ok);
    const json = await res.json();
    console.log('Response JSON:', json);
    if (!res.ok) throw new Error(json.error || "Failed to fetch state");
    setState(json);
  }, []);

  const fetchProposals = useCallback(async () => {
    const res = await fetch("/api/proposals");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to fetch proposals");
    setProposals(json.proposals || []);
  }, []);

  const tick = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/state/tick`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to tick");
      setState(json.state);
      setTimeRemaining(120); // Reset timer
      if (json.crisis) {
        setIsPaused(true);
        setCrisis(json.crisis);
      }
      await fetchProposals();
      if (Math.random() < 0.2) {
        const ev = getRandomFlavorEvent();
        setFlavorEvent(ev);
        if (ev.delta) {
          setState(prev => {
            if (!prev) return prev;
            const resources = { ...prev.resources };
            for (const [k, v] of Object.entries(ev.delta!)) {
              resources[k] = (resources[k] || 0) + v;
            }
            return { ...prev, resources };
          });
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fetchProposals]);

  useEffect(() => {
    (async () => {
      try {
        await fetchState();
        await fetchProposals();
      } catch (e: any) {
        console.error('Failed to connect to database:', e.message);
        setError(e.message);
      }
    })();
  }, [fetchState, fetchProposals]);

  // Timer for cycle progression
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (!isPaused && timeRemaining > 0) {
      timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      tick();
    }
    
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [timeRemaining, isPaused, tick]);

  // Realtime subscriptions: game_state updates and proposals changes
  useEffect(() => {
    let client: ReturnType<typeof createSupabaseBrowserClient> | null = null;
    try {
      client = createSupabaseBrowserClient();
    } catch (e: any) {
      console.warn('Realtime disabled:', e?.message || String(e));
      return; // Early exit: supabase not configured in browser env
    }

    const channel = client
      .channel('game_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, (payload: any) => {
        const next = payload?.new;
        if (next && typeof next === 'object') {
          setState(next);
        } else {
          fetchState();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => {
        fetchProposals();
      })
      .subscribe();

    return () => {
      if (client && channel) {
        client.removeChannel(channel);
      }
    };
  }, [fetchState, fetchProposals]);

  async function generate() {
    try {
      setLoading(true);
      const res = await fetch('/api/proposals/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guild }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate proposals');
      await fetchProposals();
      setGuideProgress(prev => ({ ...prev, generated: true }));
      setDismissedGuide(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function scry(id: string) {
    try {
      setLoading(true);
      const res = await fetch(`/api/proposals/${id}/scry`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to scry');
      await fetchProposals();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function decide(id: string, decision: "accept" | "reject") {
    try {
      setLoading(true);
      // Capture proposal for notice
      const selected = proposals.find(p => p.id === id) || null;
      // Optimistic UI update
      setProposals(prev => prev.map(p => p.id === id ? { ...p, status: decision === 'accept' ? 'accepted' : 'rejected' } : p));
      const res = await fetch(`/api/proposals/${id}/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to decide');
      if (decision === 'accept' && selected) {
        setAcceptedNotice({ title: selected.title, delta: selected.predicted_delta || {} });
        setDismissedGuide(true);
        setGuideProgress(prev => ({ ...prev, accepted: true }));
        if (selectedTile) {
          setMarkers(prev => [{ id: `m-${generateId()}`, x: selectedTile.x, y: selectedTile.y, label: 'Accepted' }, ...prev]);
        }
        // Auto-hide after a short delay if user doesn't advance
        setTimeout(() => setAcceptedNotice(null), 4000);
      }
      await fetchProposals();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Sim helpers
  const canAfford = useCallback((cost: Partial<SimResourcesLocal>) => {
    if (!simResources) return false;
    return (['grain','coin','mana','favor'] as SimResourceKey[]).every(k => {
      const need = (cost as any)[k] ?? 0; return (simResources as any)[k] >= need;
    });
  }, [simResources]);

  const spend = useCallback((cost: Partial<SimResourcesLocal>) => {
    setSimResources(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      (['grain','coin','mana','favor'] as SimResourceKey[]).forEach(k => {
        const need = (cost as any)[k] ?? 0; (next as any)[k] = Math.max(0, (next as any)[k] - need);
      });
      return next;
    });
  }, []);

  const produceTick = useCallback(() => {
    if (placedBuildings.length === 0) return;
    const total: Partial<SimResourcesLocal> = {};
    placedBuildings.forEach(b => {
      const prod = SIM_BUILDINGS[b.typeId].production;
      Object.entries(prod).forEach(([k, v]) => {
        total[k as SimResourceKey] = (total[k as SimResourceKey] || 0) + (v || 0);
      });
    });
    setSimResources(prev => prev ? {
      grain: prev.grain + (total.grain || 0),
      coin: prev.coin + (total.coin || 0),
      mana: prev.mana + (total.mana || 0),
      favor: prev.favor + (total.favor || 0),
      population: prev.population + (total.population || 0),
    } : prev);
    // celebratory marker
    setMarkers(prev => [{ id: `harvest-${generateId()}`, x: selectedTile?.x ?? 10, y: selectedTile?.y ?? 10, label: 'Harvest' }, ...prev]);
  }, [placedBuildings, selectedTile]);
  const handleTileHover = (x: number, y: number) => {
    setSelectedTile({ x, y });
  };

  const handleTileClick = (x: number, y: number) => {
    setSelectedTile({ x, y });

    // Sim Mode: place building when a type is selected
    if (isSimMode && selectedBuildType) {
      if (!simResources) {
        setGuideHint('Preparing resources...');
        setTimeout(() => setGuideHint(null), 1500);
        return;
      }
      if (placedBuildings.some(b => b.x === x && b.y === y)) {
        setGuideHint('A building already exists here.');
        setTimeout(() => setGuideHint(null), 1500);
        return;
      }
      const def = SIM_BUILDINGS[selectedBuildType];
      if (!canAfford(def.cost)) {
        setGuideHint('Not enough resources to build.');
        setTimeout(() => setGuideHint(null), 1500);
        return;
      }
      spend(def.cost);
      const newB = { id: generateId(), typeId: selectedBuildType, x, y, level: 1 };
      setPlacedBuildings(prev => [newB, ...prev]);
      setMarkers(prev => [{ id: `b-${generateId()}`, x, y, label: def.name }, ...prev]);
      setSelectedBuildType(null);
      return; // don't auto-open council for sim placement
    }

    if (!guideProgress.selectedTile) setGuideProgress(prev => ({ ...prev, selectedTile: true }));
    if (!hasAutoOpenedCouncilRef.current) {
      hasAutoOpenedCouncilRef.current = true;
      setIsCouncilOpen(true);
      setDismissedGuide(true);
    }
  };

  const handleLeylineCreate = (fromX: number, fromY: number, toX: number, toY: number) => {
    const newLeyline: Leyline = {
      id: generateId(),
      fromX, fromY, toX, toY,
      capacity: 100,
      currentFlow: 0,
      isActive: true
    };
    setLeylines(prev => [...prev, newLeyline]);
  };

  const handleEdictChange = (edictId: string, value: number) => {
    setPendingEdictChanges(prev => ({ ...prev, [edictId]: value }));
  };

  const applyEdictChanges = () => {
    // TODO: Persist to backend when edicts are modeled in DB
    setEdicts(prev => prev.map(e => (
      e.type === 'slider'
        ? { ...e, currentValue: pendingEdictChanges[e.id] ?? e.currentValue }
        : e
    )));
    setPendingEdictChanges({});
  };

  const resetEdictChanges = () => {
    setPendingEdictChanges({});
  };

  const openCouncil = useCallback(() => {
    setIsCouncilOpen(true);
    setGuideProgress(prev => ({ ...prev, openedCouncil: true }));
  }, []);

  const openEdicts = useCallback(() => {
    if (gameMode === 'casual' && !guideProgress.generated) {
      setGuideHint('Try generating proposals in the Council first.');
      setIsCouncilOpen(true);
      setTimeout(() => setGuideHint(null), 2500);
      return;
    }
    setIsEdictsOpen(true);
  }, [gameMode, guideProgress.generated]);

  const openOmens = useCallback(() => {
    if (gameMode === 'casual' && !guideProgress.generated) {
      setGuideHint('Try generating proposals in the Council first.');
      setIsCouncilOpen(true);
      setTimeout(() => setGuideHint(null), 2500);
      return;
    }
    setIsOmensOpen(true);
  }, [gameMode, guideProgress.generated]);

  const skipGuide = useCallback(() => {
    setDismissedGuide(true);
    try { localStorage.setItem('ad_dismissed_guide', '1'); } catch {}
  }, []);

  const startCasual = useCallback(async () => {
    setGameMode('casual');
    try { localStorage.setItem('ad_onboarding_done', '1'); localStorage.setItem('ad_game_mode', 'casual'); } catch {}
    setShowOnboarding(false);
    setIsPaused(false);
    setDismissedGuide(false);
    setGuideProgress(prev => ({ ...prev, openedCouncil: true }));
    setIsCouncilOpen(true);
    try {
      await generate();
      setGuideProgress(prev => ({ ...prev, generated: true }));
    } catch {}
  }, [generate]);

  const startAdvanced = useCallback(() => {
    setGameMode('advanced');
    try { localStorage.setItem('ad_onboarding_done', '1'); localStorage.setItem('ad_game_mode', 'advanced'); } catch {}
    setShowOnboarding(false);
    setIsPaused(false);
    setDismissedGuide(true);
  }, []);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-red-50">
        <div className="max-w-lg text-center">
          <h2 className="text-xl font-semibold text-red-800">Error</h2>
          <p className="mt-2 text-red-700">{error}</p>
          <button className="mt-4 px-4 py-2 bg-red-700 text-white rounded" onClick={() => { setError(null); fetchState().catch(() => {}); }}>Retry</button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-indigo-600 rounded-full mx-auto" />
          <p className="mt-4 text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  const resources: GameResources = {
    grain: state.resources.grain || 0,
    coin: state.resources.coin || 0,
    mana: state.resources.mana || 0,
    favor: state.resources.favor || 0,
    unrest: state.resources.unrest || 0,
    threat: state.resources.threat || 0
  };

  const gameTime: GameTime = {
    cycle: state.cycle,
    season: 'spring', // This would come from game logic
    timeRemaining
  };

  const councilProposals: CouncilProposal[] = proposals.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    type: p.guild.toLowerCase() as any,
    cost: p.predicted_delta,
    benefit: p.predicted_delta,
    risk: 25,
    duration: 1,
    canScry: true
    ,status: p.status
  }));

  const totalEdictCost = Object.entries(pendingEdictChanges).reduce((total, [edictId, value]) => {
    const edict = edicts.find(e => e.id === edictId);
    if (!edict) return total;
    return total + Math.abs((value ?? 0) - (edict.defaultValue ?? 0));
  }, 0);

  return (
    <div className="h-screen bg-neutral-50 overflow-hidden relative flex flex-col">
      <GoalBanner />

      <div className="flex-1 relative min-h-0">

        {/* Sim Mode overlays */}
        <div className="absolute top-4 right-4 z-40 flex gap-2">
          <button
            className={`px-3 py-1.5 rounded border text-sm ${isSimMode ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            onClick={() => setIsSimMode(v => !v)}
          >{isSimMode ? 'Switch to Council' : 'Enter Sim Mode'}</button>
        </div>

        {isSimMode && (
          <>
            <div className="absolute top-16 left-4 z-40 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow p-3 min-w-[220px]">
              <div className="text-sm font-semibold text-slate-800 mb-2">Town Resources</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-700">
                <span>Grain</span><span className="text-right">{simResources?.grain ?? '...'}</span>
                <span>Coin</span><span className="text-right">{simResources?.coin ?? '...'}</span>
                <span>Mana</span><span className="text-right">{simResources?.mana ?? '...'}</span>
                <span>Favor</span><span className="text-right">{simResources?.favor ?? '...'}</span>
                <span>Population</span><span className="text-right">{simResources?.population ?? '...'}</span>
              </div>
            </div>

            <div className="absolute top-16 left-64 z-40 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow p-3 min-w-[260px]">
              <div className="text-sm font-semibold text-slate-800 mb-2">Build</div>
              <div className="flex flex-wrap gap-2">
                {Object.values(SIM_BUILDINGS).map(b => (
                  <button key={b.id}
                    onClick={() => setSelectedBuildType(b.id as keyof typeof SIM_BUILDINGS)}
                    className={`px-3 py-2 rounded border text-sm ${selectedBuildType === b.id ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                  >
                    <div className="font-medium">{b.name}</div>
                    <div className="text-[11px] text-slate-500">Cost: {['coin','grain','mana','favor'].map(k => (b.cost as any)[k] ? `${k[0].toUpperCase()+k.slice(1)} ${(b.cost as any)[k]}` : null).filter(Boolean).join(', ') || 'Free'}</div>
                  </button>
                ))}
              </div>
              {selectedBuildType && (
                <div className="mt-2 text-[12px] text-slate-600">Tip: Click a tile to place a {SIM_BUILDINGS[selectedBuildType].name}.</div>
              )}
            </div>

            <div className="absolute bottom-28 left-4 z-40 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow p-3 min-w-[240px]">
              <div className="text-sm font-semibold text-slate-800 mb-1">Goal</div>
              {placedBuildings.some(b => b.typeId === 'farm') ? (
                <div className="text-sm text-slate-700">End the cycle to harvest your first grain from the Farm.</div>
              ) : (
                <div className="text-sm text-slate-700">Place your first Farm to feed your town.</div>
              )}
            </div>
          </>
        )}

        <GameRenderer onTileHover={handleTileHover} onTileClick={handleTileClick}>
          <DistrictSprites districts={districts} />
          <LeylineSystem
            leylines={leylines}
            onLeylineCreate={handleLeylineCreate}
            onLeylineSelect={setSelectedLeyline}
            selectedLeyline={selectedLeyline}
            isDrawingMode={isDrawingMode}
          />
          <HeatLayer gridSize={20} tileWidth={64} tileHeight={32} unrest={resources.unrest} threat={resources.threat} />
          {acceptedNotice && (
            <EffectsLayer
              trigger={{
                eventKey: `accept-${generateId()}`,
                deltas: acceptedNotice.delta || {},
                gridX: selectedTile?.x ?? Math.floor(10),
                gridY: selectedTile?.y ?? Math.floor(10),
              }}
            />
          )}
          {
            // Always render markers: ephemeral + persistent buildings
          }
          <MarkersLayer markers={[
            ...markers,
            ...placedBuildings.map(b => ({ id: `b-${b.id}`, x: b.x, y: b.y, label: SIM_BUILDINGS[b.typeId].name }))
          ].map(m => ({ id: m.id, gridX: m.x, gridY: m.y, label: m.label }))} />
        </GameRenderer>
      </div>

      <GameHUD
        resources={resources}
        time={gameTime}
        isPaused={isPaused}
        onPause={() => setIsPaused(true)}
        onResume={() => setIsPaused(false)}
        onAdvanceCycle={async () => { setAcceptedNotice(null); setMarkers([]); await tick(); produceTick(); setGuideProgress(prev => ({ ...prev, advanced: true })); }}
        onOpenCouncil={openCouncil}
        onOpenEdicts={openEdicts}
        onOpenOmens={openOmens}
        highlightAdvance={acceptedNotice !== null || proposals.some(p => p.status === 'accepted')}
      />


      <CouncilPanel
        isOpen={isCouncilOpen}
        onClose={() => setIsCouncilOpen(false)}
        proposals={councilProposals}
        currentResources={resources}
        onAcceptProposal={(id) => decide(id, 'accept')}
        onRejectProposal={(id) => decide(id, 'reject')}
        onScryProposal={scry}
        onGenerateProposals={generate}
        canGenerateProposals={true}
      />

      <EdictsPanel
        isOpen={isEdictsOpen}
        onClose={() => setIsEdictsOpen(false)}
        edicts={edicts}
        pendingChanges={pendingEdictChanges}
        onEdictChange={handleEdictChange}
        onApplyChanges={applyEdictChanges}
        onResetChanges={resetEdictChanges}
        currentFavor={resources.favor}
        totalCost={totalEdictCost}
      />

      <OmenPanel
        isOpen={isOmensOpen}
        onClose={() => setIsOmensOpen(false)}
        upcomingEvents={upcomingEvents}
        omenReadings={omenReadings}
        currentCycle={gameTime.cycle}
        currentSeason={gameTime.season}
        canRequestReading={true}
        readingCost={25}
        currentMana={resources.mana}
      />


      {selectedTile && (
        <div className="absolute bottom-24 left-4 bg-white/95 border border-slate-200 text-slate-800 px-3 py-2 rounded-md text-sm shadow-sm flex items-center gap-3 pointer-events-none">
          <span>Selected tile: ({selectedTile.x}, {selectedTile.y})</span>
          <button
            onClick={() => setIsCouncilOpen(true)}
            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs pointer-events-auto"
          >
            Open Council
          </button>
        </div>
      )}

      {/* Getting Started overlay */}
      {proposals.length === 0 && !dismissedGuide && !showOnboarding && gameMode === 'casual' && (
        <div className="absolute top-4 left-4 z-40 max-w-sm pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg p-4 pointer-events-none">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-slate-900 font-semibold">Getting Started</h3>
              <button
                onClick={() => { setDismissedGuide(true); try { localStorage.setItem('ad_dismissed_guide', '1'); } catch {} }}
                className="text-slate-500 hover:text-slate-900 rounded p-1 hover:bg-slate-100 pointer-events-auto"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
            <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
              <li>Open the Council panel.</li>
              <li>Click “Summon Proposals”.</li>
              <li>Optionally “Scry” to forecast impact.</li>
              <li>Accept proposals, then Advance the cycle.</li>
            </ol>
            <div className="mt-3 flex gap-2">
              <button
                onClick={openCouncil}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm pointer-events-auto"
              >
                Open Council
              </button>
              <button
                onClick={generate}
                disabled={loading}
                className={`px-3 py-1.5 rounded text-sm pointer-events-auto ${loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                Summon Proposals
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Tip: Click tiles to select; the Council handles actions.
            </div>
          </div>
        </div>
      )}

      {/* Guide Hint */}
      {guideHint && (
        <div className="absolute top-20 left-4 z-40 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-md shadow px-3 py-2 text-sm text-slate-700">
            {guideHint}
          </div>
        </div>
      )}

      {/* Guide Objectives or Survival Tracker */}
      {!showOnboarding && (
        dismissedGuide ? (
          state && (
            <div className="absolute top-4 right-4 z-40 max-w-sm w-[280px]">
              <SurvivalTracker
                cycle={state.cycle}
                unrest={state.resources.unrest || 0}
                threat={state.resources.threat || 0}
              />
            </div>
          )
        ) : (
          <div className="absolute top-4 right-4 z-40 max-w-sm w-[280px]">
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-900 font-semibold">Objectives</h3>
                <button onClick={skipGuide} className="text-xs text-slate-500 hover:text-slate-900">Skip</button>
              </div>
              <ul className="text-sm text-slate-700 space-y-1">
                <li className="flex items-center gap-2"><span className={`inline-block h-2.5 w-2.5 rounded-full ${guideProgress.selectedTile ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>Select any tile</li>
                <li className="flex items-center gap-2"><span className={`inline-block h-2.5 w-2.5 rounded-full ${guideProgress.openedCouncil ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>Open the Council</li>
                <li className="flex items-center gap-2"><span className={`inline-block h-2.5 w-2.5 rounded-full ${guideProgress.generated ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>Summon proposals</li>
                <li className="flex items-center gap-2"><span className={`inline-block h-2.5 w-2.5 rounded-full ${guideProgress.accepted ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>Accept one proposal</li>
                <li className="flex items-center gap-2"><span className={`inline-block h-2.5 w-2.5 rounded-full ${guideProgress.advanced ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>Advance the cycle</li>
              </ul>
              {!guideProgress.advanced && (
                <div className="mt-3 text-xs text-slate-500">Complete these steps to finish the intro.</div>
              )}
              {guideProgress.advanced && (
                <div className="mt-3 flex justify-end">
                  <button onClick={skipGuide} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm">Finish</button>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white w-[95%] max-w-2xl rounded-xl shadow-2xl border border-slate-200 p-6 z-10">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-900">Choose your start</h2>
              <p className="text-slate-600 text-sm mt-1">Quick setup recommended for new players. You can switch styles later.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="text-slate-900 font-semibold">Quick Start (Casual)</div>
                <div className="text-slate-600 text-sm mt-1">Guided objectives, simpler flow. We’ll open the Council and suggest actions.</div>
                <button onClick={startCasual} className="mt-3 w-full px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Start Quick Game</button>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="text-slate-900 font-semibold">Advanced</div>
                <div className="text-slate-600 text-sm mt-1">Full controls from the start. No guidance overlays.</div>
                <button onClick={startAdvanced} className="mt-3 w-full px-3 py-2 rounded bg-slate-800 hover:bg-slate-900 text-white text-sm">Start Advanced</button>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-500">We’ll remember your choice for next time.</div>
          </div>
        </div>
      )}

      {/* Accepted notice overlay */}
      {acceptedNotice && (
        <div className="absolute inset-0 pointer-events-none flex items-start justify-center mt-16 z-40">
          <div className="pointer-events-auto bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-xl p-4 max-w-md w-[90%]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-slate-900 font-semibold">Decree Accepted</div>
                <div className="text-slate-600 text-sm">{acceptedNotice.title}</div>
              </div>
              <button onClick={() => setAcceptedNotice(null)} className="text-slate-500 hover:text-slate-900 rounded p-1 hover:bg-slate-100">✕</button>
            </div>
            {Object.keys(acceptedNotice.delta || {}).length > 0 && (
              <div className="mt-2 text-xs text-slate-700">
                Predicted impact next cycle:
                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                  {Object.entries(acceptedNotice.delta).map(([k,v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="capitalize text-slate-500">{k}</span>
                      <span className={`font-mono ${Number(v) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{Number(v) >= 0 ? '+' : ''}{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button onClick={() => { setAcceptedNotice(null); tick(); }} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm">Advance Cycle</button>
              <button onClick={() => setAcceptedNotice(null)} className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm">Later</button>
            </div>
        </div>
      </div>
      )}

      {/* Flavor event dialog */}
      {flavorEvent && (
        <FlavorEvent event={flavorEvent} onClose={() => setFlavorEvent(null)} />
      )}

      {crisis && (
        <CrisisModal
          crisis={crisis}
          onResolve={() => {
            setCrisis(null);
            setIsPaused(false);
          }}
        />
      )}

      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-900/90 text-red-200 px-4 py-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}