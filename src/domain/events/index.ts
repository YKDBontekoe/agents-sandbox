export interface DomainEvent {
  type: string;
  cycle: number;
  timestamp: string;
}

export interface ProposalAccepted extends DomainEvent {
  type: 'ProposalAccepted';
  proposalId: string;
  delta: Record<string, number>;
}

export interface ResourcesUpdated extends DomainEvent {
  type: 'ResourcesUpdated';
  resources: Record<string, number>;
}

export interface BuildingProduced extends DomainEvent {
  type: 'BuildingProduced';
  buildingId: string;
  output: Record<string, number>;
}

export type GameEvent = ProposalAccepted | ResourcesUpdated | BuildingProduced;
