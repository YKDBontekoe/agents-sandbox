import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import logger from '@/lib/logger';
import { publicConfig as config } from '@/infrastructure/config';
import { sanitizeSkillList } from '@/components/game/skills/storage';
import type { Notification } from '@/components/game/hud/types';
import type { SimResources } from '@/components/game/resourceUtils';
import { simulationSystem, type EnhancedGameState, type VisualIndicator, type TimeSystem } from '@engine';
import type { CrisisData } from '@/components/game/CrisisModal';
import type { GameState, Proposal, StoredBuilding } from '../types';

export interface GuideProgress {
  selectedTile: boolean;
  openedCouncil: boolean;
  generated: boolean;
  accepted: boolean;
  advanced: boolean;
}

interface Marker {
  id: string;
  x: number;
  y: number;
  label?: string;
}

interface UsePlayGameStateOptions {
  initialState?: GameState | null;
  initialProposals?: Proposal[];
  timeSystem: TimeSystem;
  syncSkillsFromServer: (skills: string[]) => void;
  setPlacedBuildings: Dispatch<SetStateAction<StoredBuilding[]>>;
  setSimResources: Dispatch<SetStateAction<SimResources | null>>;
  setRoads: Dispatch<SetStateAction<Array<{ x: number; y: number }>>>;
  setCitizensCount: (count: number) => void;
  setCitizensSeed: (seed: number) => void;
  setGridSize: (size: number) => void;
  setPendingMapSize: (size: number) => void;
  setMapSizeModalOpen: (open: boolean) => void;
  setDismissedGuide: (dismissed: boolean) => void;
  setGuideProgress: Dispatch<SetStateAction<GuideProgress>>;
  setAcceptedNotice: (notice: { title: string; delta: Record<string, number> } | null) => void;
  selectedTile: { x: number; y: number; tileType?: string } | null;
  generateMarkerId: () => string;
  setMarkers: Dispatch<SetStateAction<Marker[]>>;
  notify: (notification: Notification) => void;
  setCrisis: (crisis: CrisisData | null) => void;
  setEnhancedGameState: Dispatch<SetStateAction<EnhancedGameState | null>>;
  setVisualIndicators: Dispatch<SetStateAction<VisualIndicator[]>>;
}

interface UsePlayGameStateResult {
  state: GameState | null;
  setState: Dispatch<SetStateAction<GameState | null>>;
  proposals: Proposal[];
  loading: boolean;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  isPaused: boolean;
  setIsPaused: Dispatch<SetStateAction<boolean>>;
  timeRemaining: number;
  fetchState: () => Promise<void>;
  fetchProposals: () => Promise<void>;
  tick: () => Promise<{ simRes: SimResources; state: GameState } | null>;
  generate: (guild: string) => Promise<void>;
  scry: (id: string) => Promise<void>;
  decide: (id: string, decision: 'accept' | 'reject') => Promise<void>;
}

export function usePlayGameState({
  initialState = null,
  initialProposals = [],
  timeSystem,
  syncSkillsFromServer,
  setPlacedBuildings,
  setSimResources,
  setRoads,
  setCitizensCount,
  setCitizensSeed,
  setGridSize,
  setPendingMapSize,
  setMapSizeModalOpen,
  setDismissedGuide,
  setGuideProgress,
  setAcceptedNotice,
  selectedTile,
  generateMarkerId,
  setMarkers,
  notify,
  setCrisis,
  setEnhancedGameState,
  setVisualIndicators,
}: UsePlayGameStateOptions): UsePlayGameStateResult {
  const [state, setState] = useState<GameState | null>(initialState);
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(() => {
    if (initialState && typeof (initialState as any).auto_ticking === 'boolean') {
      return !(initialState as any).auto_ticking;
    }
    return true;
  });
  const [timeRemaining, setTimeRemaining] = useState(60);

  const proposalsRef = useRef(proposals);
  useEffect(() => {
    proposalsRef.current = proposals;
  }, [proposals]);

  const fetchState = useCallback(async () => {
    logger.debug('Fetching state from /api/state');
    const res = await fetch('/api/state');
    logger.debug('Response status:', res.status, res.ok);
    const json = await res.json();
    logger.debug('Response JSON:', json);
    if (!res.ok) {
      const msg = json?.error || `Failed to fetch state (${res.status})`;
      if (config.nextPublicOfflineMode) {
        logger.warn('Offline mode enabled: using local fallback state:', msg);
        setState({
          id: 'local-fallback',
          cycle: 1,
          resources: { grain: 1000, coin: 500, mana: 200, favor: 10, unrest: 0, threat: 0 },
          workers: 0,
          buildings: [],
        });
        return;
      }
      throw new Error(msg);
    }

    const rawSkills = (json as any).skills;
    const sanitizedSkills = Array.isArray(rawSkills) ? sanitizeSkillList(rawSkills) : undefined;

    const nextState: GameState = {
      ...json,
      workers: json.workers ?? 0,
      buildings: json.buildings ?? [],
      routes: (json as any).routes ?? [],
      roads: (json as any).roads ?? [],
      citizens_seed: (json as any).citizens_seed,
      citizens_count: (json as any).citizens_count,
      ...(sanitizedSkills !== undefined ? { skills: sanitizedSkills } : {}),
    };

    setState(nextState);
    if (sanitizedSkills !== undefined) {
      syncSkillsFromServer(sanitizedSkills);
    }
    try {
      setIsPaused(!(json as any).auto_ticking);
    } catch {}
    try {
      setRoads(((json as any).roads as Array<{ x: number; y: number }>) ?? []);
    } catch {}
    try {
      if ((json as any).citizens_count) setCitizensCount((json as any).citizens_count as number);
    } catch {}
    try {
      if ((json as any).citizens_seed) setCitizensSeed((json as any).citizens_seed as number);
    } catch {}
    try {
      if ((json as any).map_size) {
        const savedSize = Math.max(8, Math.min(48, Number((json as any).map_size) || 24));
        setGridSize(savedSize);
        setPendingMapSize(savedSize);
        setMapSizeModalOpen(false);
      }
    } catch {}
  }, [setCitizensCount, setCitizensSeed, setGridSize, setMapSizeModalOpen, setPendingMapSize, setRoads, syncSkillsFromServer]);

  const fetchProposals = useCallback(async () => {
    const res = await fetch('/api/proposals');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch proposals');
    setProposals(json.proposals || []);
  }, []);

  const tick = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/state/tick', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to tick');
      const serverState: GameState = {
        ...json.state,
        workers: json.state.workers ?? 0,
        buildings: json.state.buildings ?? [],
      };
      const tickSkills = Array.isArray((json.state as any)?.skills)
        ? sanitizeSkillList((json.state as any).skills)
        : undefined;
      if (tickSkills !== undefined) {
        serverState.skills = tickSkills;
        syncSkillsFromServer(tickSkills);
      }
      setState(serverState);
      const assigned = serverState.buildings.reduce((sum, b) => sum + (b.workers || 0), 0);
      const simRes: SimResources = {
        grain: serverState.resources.grain || 0,
        coin: serverState.resources.coin || 0,
        mana: serverState.resources.mana || 0,
        favor: serverState.resources.favor || 0,
        workers: (serverState.workers || 0) - assigned,
        wood: (serverState.resources as any).wood || 0,
        planks: (serverState.resources as any).planks || 0,
      };
      setSimResources(simRes);
      setPlacedBuildings(serverState.buildings);
      const ms = Number((json.state as any)?.tick_interval_ms ?? 60000);
      setTimeRemaining(Math.max(1, Math.round(ms / 1000)));
      if (json.crisis) {
        setIsPaused(true);
        setCrisis(json.crisis);
      }
      await fetchProposals();

      try {
        const simulationInput = {
          buildings: serverState.buildings,
          resources: simRes,
          gameTime: timeSystem.getCurrentTime(),
        };
        const enhancedState = simulationSystem.updateSimulation(simulationInput, 1.0);
        setEnhancedGameState(enhancedState);
        const indicators = simulationSystem.generateVisualIndicators(enhancedState);
        setVisualIndicators(indicators);
      } catch (simError) {
        logger.warn('Simulation system update failed:', simError);
      }

      return { simRes, state: serverState };
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchProposals, setCrisis, setEnhancedGameState, setPlacedBuildings, setSimResources, setVisualIndicators, syncSkillsFromServer, timeSystem]);

  const generate = useCallback(async (guild: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate proposals');
      await fetchProposals();
      notify({ type: 'success', title: 'Proposals Summoned', message: 'New counsel ideas await review.' });
      setDismissedGuide(true);
      setGuideProgress((prev) => ({ ...prev, generated: true }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [fetchProposals, notify, setDismissedGuide, setGuideProgress]);

  const scry = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/proposals/${id}/scry`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to scry');
      await fetchProposals();
      const proposal = proposalsRef.current.find((p) => p.id === id);
      if (proposal?.predicted_delta) {
        const parts = Object.entries(proposal.predicted_delta)
          .slice(0, 3)
          .map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`)
          .join('  ');
        notify({ type: 'info', title: 'Scry Result', message: parts || 'Forecast updated.' });
      } else {
        notify({ type: 'info', title: 'Scry Result', message: 'Forecast updated.' });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [fetchProposals, notify]);

  const decide = useCallback(
    async (id: string, decision: 'accept' | 'reject') => {
      try {
        setLoading(true);
        const selected = proposalsRef.current.find((p) => p.id === id) || null;
        setProposals((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: decision === 'accept' ? 'accepted' : 'rejected' } : p)),
        );
        const res = await fetch(`/api/proposals/${id}/decide`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to decide');
        if (decision === 'accept' && selected) {
          setAcceptedNotice({ title: selected.title, delta: selected.predicted_delta || {} });
          notify({ type: 'success', title: 'Decree Accepted', message: selected.title });
          setDismissedGuide(true);
          setGuideProgress((prev) => ({ ...prev, accepted: true }));
          if (selectedTile) {
            setMarkers((prev) => [
              { id: `m-${generateMarkerId()}`, x: selectedTile.x, y: selectedTile.y, label: 'Accepted' },
              ...prev,
            ]);
          }
          setTimeout(() => setAcceptedNotice(null), 4000);
        } else if (decision === 'reject' && selected) {
          notify({ type: 'warning', title: 'Proposal Rejected', message: selected.title });
        }
        await fetchProposals();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [fetchProposals, generateMarkerId, notify, selectedTile, setAcceptedNotice, setDismissedGuide, setGuideProgress, setMarkers],
  );

  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;
    (async () => {
      try {
        if (!initialState) {
          await fetchState();
        }
        await fetchProposals();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error('Failed to connect to database:', message);
        setError(message);
      }
    })();
  }, [fetchProposals, fetchState, initialState]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const updateCountdown = () => {
      if (!state) return;
      const lastStr = (state as any).last_tick_at as string | undefined;
      const ms = Number((state as any).tick_interval_ms ?? 60000);
      const last = lastStr ? Date.parse(lastStr) : Date.now();
      const diff = last + ms - Date.now();
      const secs = Math.max(0, Math.ceil(diff / 1000));
      setTimeRemaining(secs);
    };
    updateCountdown();
    interval = setInterval(updateCountdown, 1000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state]);

  useEffect(() => {
    let hb: NodeJS.Timeout | null = null;
    const ping = async () => {
      try {
        if (!isPaused) {
          await fetch('/api/state/heartbeat', { method: 'POST' });
        }
      } catch {}
    };
    ping();
    hb = setInterval(ping, 1000);
    return () => {
      if (hb) clearInterval(hb);
    };
  }, [isPaused]);

  useEffect(() => {
    if (config.nextPublicDisableRealtime || config.nodeEnv === 'development') {
      logger.debug('Realtime disabled by environment flag');
      return undefined;
    }
    let client: ReturnType<typeof createSupabaseBrowserClient> | null = null;
    let channel: ReturnType<ReturnType<typeof createSupabaseBrowserClient>['channel']> | null = null;
    try {
      client = createSupabaseBrowserClient(config);
    } catch (e: unknown) {
      logger.debug('Realtime disabled:', e instanceof Error ? e.message : String(e));
      return undefined;
    }

    channel = client
      .channel('game_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, (payload: { new?: unknown }) => {
        const next = payload?.new as GameState | undefined;
        if (next && typeof next === 'object') {
          const realtimeSkills = Array.isArray((next as any).skills) ? sanitizeSkillList((next as any).skills) : undefined;
          const patchedNext = realtimeSkills !== undefined ? { ...next, skills: realtimeSkills } : next;
          setState(patchedNext as GameState);
          if (realtimeSkills !== undefined) {
            syncSkillsFromServer(realtimeSkills);
          }
          try {
            setIsPaused(!(next as any).auto_ticking);
          } catch {}
          const assigned = (next.buildings || []).reduce((sum, b) => sum + (b.workers || 0), 0);
          setPlacedBuildings(next.buildings || []);
          setSimResources({
            grain: next.resources.grain || 0,
            coin: next.resources.coin || 0,
            mana: next.resources.mana || 0,
            favor: next.resources.favor || 0,
            wood: (next.resources as any).wood || 0,
            planks: (next.resources as any).planks || 0,
            workers: (next.workers || 0) - assigned,
          });
          try {
            setRoads(((next as any).roads as Array<{ x: number; y: number }>) ?? []);
          } catch {}
          try {
            if ((next as any).citizens_count) setCitizensCount((next as any).citizens_count as any);
          } catch {}
          try {
            if ((next as any).citizens_seed) setCitizensSeed((next as any).citizens_seed as any);
          } catch {}
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => {
        void fetchProposals();
      })
      .subscribe();

    return () => {
      if (client && channel) client.removeChannel(channel);
    };
  }, [fetchProposals, setCitizensCount, setCitizensSeed, setPlacedBuildings, setRoads, setSimResources, syncSkillsFromServer]);

  return {
    state,
    setState,
    proposals,
    loading,
    error,
    setError,
    isPaused,
    setIsPaused,
    timeRemaining,
    fetchState,
    fetchProposals,
    tick,
    generate,
    scry,
    decide,
  };
}
