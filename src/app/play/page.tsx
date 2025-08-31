'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import GameRenderer from '@/components/game/GameRenderer';

import { GameHUD, GameResources, GameTime } from '@/components/game/GameHUD';
import { CouncilPanel, CouncilProposal } from '@/components/game/CouncilPanel';
import { EdictsPanel, EdictSetting } from '@/components/game/EdictsPanel';
import { OmenPanel, SeasonalEvent, OmenReading } from '@/components/game/OmenPanel';
import DistrictSprites, { District, DistrictType, DistrictTier, DistrictState } from '@/components/game/DistrictSprites';
import { LeylineSystem, Leyline } from '@/components/game/LeylineSystem';

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
  
  // Game world state
  const [districts, setDistricts] = useState<District[]>([]);
  const [leylines, setLeylines] = useState<Leyline[]>([]);
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [selectedLeyline, setSelectedLeyline] = useState<Leyline | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  
  // Mock data for panels
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
        // Temporarily set mock state to test rendering
        setState({
          id: 'test-state',
          cycle: 1,
          resources: {
            grain: 100,
            coin: 50,
            mana: 75,
            favor: 25,
            unrest: 10,
            threat: 5
          }
        });
        
        await fetchState();
        await fetchProposals();
        initializeMockData();
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

  const mockData = useMemo(() => ({
    districts: [
      { id: '1', gridX: 5, gridY: 5, worldX: 320, worldY: 160, type: DistrictType.FARM, tier: DistrictTier.TIER_1, state: DistrictState.NORMAL },
      { id: '2', gridX: 7, gridY: 6, worldX: 448, worldY: 192, type: DistrictType.MARKET, tier: DistrictTier.TIER_2, state: DistrictState.EMPOWERED },
      { id: '3', gridX: 3, gridY: 8, worldX: 192, worldY: 256, type: DistrictType.SANCTUM, tier: DistrictTier.TIER_1, state: DistrictState.NORMAL },
      { id: '4', gridX: 9, gridY: 4, worldX: 576, worldY: 128, type: DistrictType.FORGE, tier: DistrictTier.TIER_3, state: DistrictState.DISABLED },
      { id: '5', gridX: 6, gridY: 9, worldX: 384, worldY: 288, type: DistrictType.WELL, tier: DistrictTier.TIER_2, state: DistrictState.NORMAL },
      { id: '6', gridX: 2, gridY: 3, worldX: 128, worldY: 96, type: DistrictType.WATCHTOWER, tier: DistrictTier.TIER_1, state: DistrictState.NORMAL },
    ],
    leylines: [
      { id: '1', fromX: 5, fromY: 5, toX: 7, toY: 6, capacity: 100, currentFlow: 75, isActive: true },
      { id: '2', fromX: 7, fromY: 6, toX: 3, toY: 8, capacity: 80, currentFlow: 40, isActive: true },
      { id: '3', fromX: 9, fromY: 4, toX: 6, toY: 9, capacity: 120, currentFlow: 0, isActive: false },
    ],
    edicts: [
       {
         id: 'tax_rate',
         name: 'Tax Rate',
         description: 'Adjust the taxation level on citizens',
         type: 'slider' as const,
         category: 'economic' as const,
         currentValue: 50,
         defaultValue: 50,
         cost: 10,
         effects: [
           { resource: 'Coin', impact: '+2 per 10% tax rate' },
           { resource: 'Unrest', impact: '+1 per 20% above 50%' }
         ]
       },
       {
         id: 'military_patrol',
         name: 'Military Patrols',
         description: 'Enable regular military patrols in the realm',
         type: 'toggle' as const,
         category: 'military' as const,
         currentValue: 1,
         defaultValue: 0,
         cost: 15,
         effects: [
           { resource: 'Threat', impact: '-2 per cycle' },
           { resource: 'Coin', impact: '-5 per cycle' }
         ]
       }
     ],
     events: [
       {
         id: '1',
         name: 'Harvest Festival',
         description: 'A bountiful harvest brings prosperity to the realm',
         type: 'blessing' as const,
         season: 'autumn' as const,
         cycleOffset: 2,
         probability: 85,
         effects: [{ resource: 'Grain', impact: '+50' }, { resource: 'Favor', impact: '+10' }],
         isRevealed: true
       },
       {
         id: '2',
         name: 'Mysterious Plague',
         description: 'A strange sickness spreads through the land',
         type: 'curse' as const,
         season: 'winter' as const,
         cycleOffset: 5,
         probability: 60,
         effects: [{ resource: 'Grain', impact: '-30' }, { resource: 'Unrest', impact: '+15' }],
         duration: 3,
         isRevealed: false
       }
     ]
  }), []);

  const initializeMockData = useCallback(() => {
    setDistricts(mockData.districts);
    setLeylines(mockData.leylines);
    setEdicts(mockData.edicts);
    setUpcomingEvents(mockData.events);
  }, [mockData]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guild }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate proposals");
      await fetchProposals();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function scry(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${id}/scry`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to scry");
      await fetchProposals();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function decide(id: string, decision: "accept" | "reject") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to decide");
      await fetchProposals();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleTileHover = (x: number, y: number) => {
    // Handle tile hover effects
  };

  const handleTileClick = (x: number, y: number) => {
    setSelectedTile({ x, y });
  };

  const handleLeylineCreate = (fromX: number, fromY: number, toX: number, toY: number) => {
    const newLeyline: Leyline = {
      id: `leyline_${Date.now()}`,
      fromX,
      fromY,
      toX,
      toY,
      capacity: 100,
      currentFlow: 0,
      isActive: false
    };
    setLeylines(prev => [...prev, newLeyline]);
    setIsDrawingMode(false);
  };

  const handleEdictChange = (edictId: string, value: number) => {
    setPendingEdictChanges(prev => ({ ...prev, [edictId]: value }));
  };

  const applyEdictChanges = () => {
    setEdicts(prev => prev.map(edict => ({
      ...edict,
      currentValue: pendingEdictChanges[edict.id] ?? edict.currentValue
    })));
    setPendingEdictChanges({});
  };

  const resetEdictChanges = () => {
    setPendingEdictChanges({});
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Service Unavailable</h1>
          <p className="text-lg mb-6">Unable to connect to the game database. Please check your configuration and try again.</p>
          <div className="text-sm text-gray-400 mb-6">
            Error: {error}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
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
  }));

  const totalEdictCost = Object.entries(pendingEdictChanges).reduce((total, [edictId, value]) => {
    const edict = edicts.find(e => e.id === edictId);
    if (edict && edict.currentValue !== value) {
      return total + (edict.cost || 0);
    }
    return total;
  }, 0);

  return (
    <div className="h-screen bg-neutral-50 overflow-hidden relative flex flex-col">
      {/* Game Canvas - Responsive container */}
      <div className="flex-1 relative min-h-0">

        <GameRenderer
          width={1200}
          height={800}
          onTileHover={handleTileHover}
          onTileClick={handleTileClick}
        >
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

      {/* HUD Overlay */}
      <GameHUD
        resources={resources}
        time={gameTime}
        isPaused={isPaused}
        onPause={() => setIsPaused(true)}
        onResume={() => setIsPaused(false)}
        onAdvanceCycle={tick}
        onOpenCouncil={() => setIsCouncilOpen(true)}
        onOpenEdicts={() => setIsEdictsOpen(true)}
        onOpenOmens={() => setIsOmensOpen(true)}
      />

      {/* Panels */}
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

      {/* Debug Info */}
      {selectedTile && (
        <div className="absolute bottom-20 left-4 bg-black/80 text-white p-2 rounded text-sm">
          Selected: ({selectedTile.x}, {selectedTile.y})
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