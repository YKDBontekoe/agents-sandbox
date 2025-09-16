export interface StoredBuilding {
  id: string;
  typeId: string;
  x: number;
  y: number;
  level: number;
  workers: number;
  traits?: {
    waterAdj?: number;
    mountainAdj?: number;
    forestAdj?: number;
  };
}

export interface TradeRoute {
  id: string;
  fromId: string;
  toId: string;
  length: number;
}

export interface GameState {
  id: string;
  cycle: number;
  resources: Record<string, number>;
  workers: number;
  buildings: StoredBuilding[];
  routes?: TradeRoute[];
  edicts?: Record<string, number>;
  map_size?: number;
  tick_interval_ms?: number;
  auto_ticking?: boolean;
  roads?: Array<{ x: number; y: number }>;
  citizens_count?: number;
  citizens_seed?: number;
}

export interface Proposal {
  id: string;
  guild: string;
  title: string;
  description: string;
  status: "pending" | "accepted" | "rejected" | "applied";
  predicted_delta: Record<string, number>;
}

export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  cycle: number;
}

export interface OmenReading {
  id: string;
  text: string;
  type: string;
  cycle: number;
}

export interface PlayPageProps {
  initialState?: GameState | null;
  initialProposals?: Proposal[];
}
