export interface BehaviorHistoryEntry {
  pattern: string;
  timestamp: number;
  success: boolean;
  satisfaction: number;
}

export class BehaviorHistoryStore {
  private readonly histories = new Map<string, BehaviorHistoryEntry[]>();

  constructor(private readonly maxEntries = 50) {}

  record(citizenId: string, pattern: string, timestamp: number): BehaviorHistoryEntry {
    const entry: BehaviorHistoryEntry = { pattern, timestamp, success: false, satisfaction: 0 };
    const history = this.histories.get(citizenId) ?? [];
    history.push(entry);

    if (history.length > this.maxEntries) {
      history.shift();
    }

    this.histories.set(citizenId, history);
    return entry;
  }

  updateLast(
    citizenId: string,
    updates: Partial<Pick<BehaviorHistoryEntry, 'success' | 'satisfaction'>>
  ): void {
    const history = this.histories.get(citizenId);
    if (!history || history.length === 0) {
      return;
    }

    const lastEntry = history[history.length - 1];
    if (typeof updates.success === 'boolean') {
      lastEntry.success = updates.success;
    }

    if (typeof updates.satisfaction === 'number') {
      lastEntry.satisfaction = updates.satisfaction;
    }
  }

  getRecent(citizenId: string, limit = 10): BehaviorHistoryEntry[] {
    const history = this.histories.get(citizenId);
    if (!history || history.length === 0) {
      return [];
    }

    return history.slice(-limit);
  }

  getLast(citizenId: string): BehaviorHistoryEntry | undefined {
    const history = this.histories.get(citizenId);
    return history?.[history.length - 1];
  }

  reset(citizenId: string): void {
    this.histories.set(citizenId, []);
  }

  cleanup(activeCitizenIds: Iterable<string>): void {
    const activeSet = new Set(activeCitizenIds);
    for (const citizenId of this.histories.keys()) {
      if (!activeSet.has(citizenId)) {
        this.histories.delete(citizenId);
      }
    }
  }
}
