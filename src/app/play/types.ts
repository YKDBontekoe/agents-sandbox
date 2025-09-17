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

export interface Proposal {
  id: string;
  guild: string;
  title: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'applied';
  predicted_delta: Record<string, number>;
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
  skills?: string[];
  skill_tree_seed?: number;
  pinned_skill_targets?: string[];
  [key: string]: unknown;
}
