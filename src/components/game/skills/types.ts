import { SkillNode, SkillTree } from './procgen';
import type { UnlockCondition } from './procgen';

export type Vec2 = { x: number; y: number };

export interface ConstellationSkillTreeProps {
  tree: SkillTree;
  unlocked: Record<string, boolean>;
  onUnlock: (node: SkillNode) => void;
  colorFor: (category: SkillNode['category']) => string;
  focusNodeId?: string;
  resources?: { coin?: number; mana?: number; favor?: number };
  onSelectNode?: (id: string | null) => void;
}

export interface StarField {
  x: number;
  y: number;
  brightness: number;
  twinkle: number;
  size: number;
}

export interface ConstellationNode {
  node: SkillNode;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  constellation: string;
  tier: number;
}

export interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  node: SkillNode | null;
  fadeIn: number;
  anchor: 'top' | 'bottom' | 'left' | 'right';
  offset: { x: number; y: number };
}

export interface ParticleEffect {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'unlock' | 'hover' | 'connection' | 'ambient';
}

export interface AnimatedConnection {
  from: ConstellationNode;
  to: ConstellationNode;
  progress: number;
  particles: ParticleEffect[];
}

export type { UnlockCondition };
