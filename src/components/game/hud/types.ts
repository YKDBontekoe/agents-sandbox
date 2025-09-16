export interface GameResources {
  grain: number;
  coin: number;
  mana: number;
  favor: number;
  wood: number;
  planks: number;
  unrest: number;
  threat: number;
}

export interface GameTime {
  cycle: number;
  season: string;
  timeRemaining: number; // seconds until next cycle
  isPaused?: boolean;
  intervalMs?: number;
}

export interface WorkforceInfo {
  total: number;
  idle: number;
  needed: number;
}

export type NotificationActionKind =
  | 'open-council'
  | 'open-edicts'
  | 'open-settings'
  | 'focus-tile'
  | 'navigate'
  | (string & {});

export interface NotificationAction {
  kind: NotificationActionKind;
  label?: string;
  payload?: Record<string, unknown>;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  persistent?: boolean;
  read?: boolean;
  action?: NotificationAction;
}

export interface GameHUDProps {
  resources: GameResources;
  time: GameTime;
  workforce: WorkforceInfo;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onAdvanceCycle?: () => void;
  onOpenCouncil?: () => void;
  onOpenEdicts?: () => void;
  onOpenOmens?: () => void;
  onOpenSettings?: () => void;
  highlightAdvance?: boolean;
  shortages?: Partial<Record<keyof GameResources, number>>;
  fps?: number;
  quality?: string;
}
