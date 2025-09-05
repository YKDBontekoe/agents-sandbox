import { Building } from './Building';

export type ResKey = 'grain' | 'wood' | 'planks' | 'coin' | 'mana' | 'favor' | 'unrest' | 'threat';

export interface Route {
  id: string;
  fromId: string;
  toId: string;
  length?: number;
}

export interface GameState {
  id: string;
  cycle: number;
  max_cycle?: number;
  resources: Record<ResKey, number>;
  workers?: number;
  buildings?: Building[];
  routes?: Route[];
  edicts?: Record<string, number>;
  updated_at?: string;
  [key: string]: unknown;
}
