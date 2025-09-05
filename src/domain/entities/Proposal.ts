import { ResKey } from './GameState';

export interface Proposal {
  id?: string;
  state_id?: string;
  guild: string;
  title: string;
  description: string;
  predicted_delta: Record<ResKey, number>;
  status?: string;
  [key: string]: unknown;
}
