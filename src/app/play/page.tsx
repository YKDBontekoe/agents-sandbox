'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import GameRenderer from '@/components/game/GameRenderer';

import { GameHUD, GameResources, GameTime } from '@/components/game/GameHUD';
import { CouncilPanel, CouncilProposal } from '@/components/game/CouncilPanel';
import { EdictsPanel, EdictSetting } from '@/components/game/EdictsPanel';
import { OmenPanel, SeasonalEvent, OmenReading } from '@/components/game/OmenPanel';
import DistrictSprites, { District } from '@/components/game/DistrictSprites';
import { LeylineSystem, Leyline } from '@/components/game/LeylineSystem';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

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

export default function PlayPage() {

  
  const [state, setState] = useState<GameState | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [guild, setGuild] = useState("Wardens");
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes per cycle
  
  // Panel states
  const [isCouncilOpen, setIsCouncilOpen] = useState(false);
  const [isEdictsOpen, setIsEdictsOpen] = useState(false);
  const [isOmensOpen, setIsOmensOpen] = useState(false);
  const [dismissedGuide, setDismissedGuide] = useState(false);
  const [acceptedNotice, setAcceptedNotice] = useState<{ title: string; delta: Record<string, number> } | null>(null);
  
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
      setState(json);
      setTimeRemaining(120); // Reset timer
      await fetchProposals();
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

  const handleTileHover = (x: number, y: number) => {
    setSelectedTile({ x, y });
  };

  const handleTileClick = (x: number, y: number) => {
    setSelectedTile({ x, y });
    if (!hasAutoOpenedCouncilRef.current) {
      hasAutoOpenedCouncilRef.current = true;
      setIsCouncilOpen(true);
      setDismissedGuide(true);
    }
  };

  const handleLeylineCreate = (fromX: number, fromY: number, toX: number, toY: number) => {
    const newLeyline: Leyline = {
      id: Math.random().toString(36).substring(2),
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

      <div className="flex-1 relative min-h-0">

        <GameRenderer onTileHover={handleTileHover} onTileClick={handleTileClick}>
          <DistrictSprites districts={districts} />
          <LeylineSystem
            leylines={leylines}
            onLeylineCreate={handleLeylineCreate}
            onLeylineSelect={setSelectedLeyline}
            selectedLeyline={selectedLeyline}
            isDrawingMode={isDrawingMode}
          />
        </GameRenderer>
      </div>

      <GameHUD
        resources={resources}
        time={gameTime}
        isPaused={isPaused}
        onPause={() => setIsPaused(true)}
        onResume={() => setIsPaused(false)}
        onAdvanceCycle={async () => { setAcceptedNotice(null); await tick(); }}
        onOpenCouncil={() => setIsCouncilOpen(true)}
        onOpenEdicts={() => setIsEdictsOpen(true)}
        onOpenOmens={() => setIsOmensOpen(true)}
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
      {proposals.length === 0 && !dismissedGuide && (
        <div className="absolute top-4 left-4 z-40 max-w-sm pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg p-4 pointer-events-none">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-slate-900 font-semibold">Getting Started</h3>
              <button
                onClick={() => setDismissedGuide(true)}
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
                onClick={() => setIsCouncilOpen(true)}
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

      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-900/90 text-red-200 px-4 py-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
