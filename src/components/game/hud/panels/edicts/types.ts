import type { CategoryType } from '@arcane/ui';

export interface EdictEffect {
  resource: string;
  impact: string;
}

export interface EdictSetting {
  id: string;
  name: string;
  description: string;
  type: 'slider' | 'toggle';
  category: CategoryType;
  currentValue: number;
  defaultValue: number;
  cost?: number;
  effects: EdictEffect[];
  requirements?: string[];
  isLocked?: boolean;
}
