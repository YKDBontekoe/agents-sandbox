export type RelationshipKind = 'friend' | 'colleague' | 'rival' | 'family';

export interface CitizenRelationshipRecord {
  citizenId: string;
  relationship: RelationshipKind;
  strength: number;
  lastInteraction: number;
}

export class RelationshipStore {
  private readonly relationships = new Map<string, Map<string, CitizenRelationshipRecord>>();

  ensure(citizenId: string): void {
    if (!this.relationships.has(citizenId)) {
      this.relationships.set(citizenId, new Map());
    }
  }

  upsert(citizenId: string, record: CitizenRelationshipRecord): void {
    this.ensure(citizenId);
    this.relationships.get(citizenId)?.set(record.citizenId, { ...record });
  }

  getAll(citizenId: string): CitizenRelationshipRecord[] {
    return Array.from(this.relationships.get(citizenId)?.values() ?? []);
  }

  getCount(citizenId: string): number {
    return this.relationships.get(citizenId)?.size ?? 0;
  }

  getByType(citizenId: string, type: RelationshipKind): CitizenRelationshipRecord[] {
    return this.getAll(citizenId).filter(record => record.relationship === type);
  }

  reset(citizenId: string): void {
    this.relationships.set(citizenId, new Map());
  }

  cleanup(activeCitizenIds: Iterable<string>): void {
    const activeSet = new Set(activeCitizenIds);
    for (const citizenId of this.relationships.keys()) {
      if (!activeSet.has(citizenId)) {
        this.relationships.delete(citizenId);
      }
    }
  }
}
