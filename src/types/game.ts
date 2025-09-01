export interface GameResources {
  grain: number;
  coin: number;
  mana: number;
  favor: number;
  unrest: number;
  threat: number;
}

export interface GameTime {
  cycle: number;
  season: string;
  timeRemaining: number; // seconds until next cycle
}

export interface ProposalDelta {
  grain?: number;
  coin?: number;
  mana?: number;
  favor?: number;
  unrest?: number;
  threat?: number;
}

export interface CouncilProposal {
  id: string;
  title: string;
  description: string;
  type: 'economic' | 'military' | 'diplomatic' | 'mystical' | 'infrastructure';
  cost: ProposalDelta;
  benefit: ProposalDelta;
  risk: number; // 0-100 percentage
  duration: number; // cycles to complete
  requirements?: string[];
  canScry: boolean;
  scryResult?: {
    successChance: number;
    hiddenEffects?: string[];
  };
  status?: 'pending' | 'accepted' | 'rejected' | 'applied';
}
