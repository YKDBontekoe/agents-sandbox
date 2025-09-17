import { createCitizen } from './citizenFactory';
import type { Citizen } from './citizen';
import type { SocialRelationship } from './types';

export class CitizenRegistry {
  private citizens: Map<string, Citizen> = new Map();
  private socialNetwork: Map<string, Set<string>> = new Map();

  createCitizen(id: string, name: string, age: number, seed: number): Citizen {
    const citizen = createCitizen({ id, name, age, seed });

    this.citizens.set(id, citizen);
    this.socialNetwork.set(id, new Set());

    return citizen;
  }

  getCitizen(id: string): Citizen | undefined {
    return this.citizens.get(id);
  }

  getAllCitizens(): Citizen[] {
    return Array.from(this.citizens.values());
  }

  getSocialConnections(id: string): string[] {
    return Array.from(this.socialNetwork.get(id) ?? []);
  }

  connectCitizens(a: string, b: string): void {
    if (!this.citizens.has(a) || !this.citizens.has(b)) {
      return;
    }

    const networkA = this.socialNetwork.get(a) ?? new Set<string>();
    const networkB = this.socialNetwork.get(b) ?? new Set<string>();

    networkA.add(b);
    networkB.add(a);

    this.socialNetwork.set(a, networkA);
    this.socialNetwork.set(b, networkB);
  }

  disconnectCitizens(a: string, b: string): void {
    this.socialNetwork.get(a)?.delete(b);
    this.socialNetwork.get(b)?.delete(a);
  }

  decaySocialRelationships(citizenId: string, currentCycle: number): void {
    const citizen = this.citizens.get(citizenId);
    if (!citizen) return;

    for (let i = citizen.relationships.length - 1; i >= 0; i -= 1) {
      const relationship: SocialRelationship = citizen.relationships[i];
      const daysSinceInteraction = currentCycle - relationship.lastInteraction;

      if (daysSinceInteraction > 7) {
        relationship.strength = Math.max(0, relationship.strength - 1);
      }

      if (relationship.strength < 10) {
        citizen.relationships.splice(i, 1);
        this.socialNetwork.get(citizenId)?.delete(relationship.targetId);
      }
    }
  }
}
