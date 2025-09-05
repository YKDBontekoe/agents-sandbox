import { EventStore, GameState } from '@/infrastructure/eventStore';
import { GameEvent, ProposalAccepted, BuildingProduced, ResourcesUpdated } from '@/domain/events';

function applyEvent(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'ProposalAccepted':
      for (const [k, v] of Object.entries(event.delta)) {
        state.resources[k] = (state.resources[k] || 0) + v;
      }
      break;
    case 'BuildingProduced':
      for (const [k, v] of Object.entries(event.output)) {
        state.resources[k] = (state.resources[k] || 0) + v;
      }
      break;
    case 'ResourcesUpdated':
      state.resources = { ...event.resources };
      state.cycle = event.cycle;
      break;
  }
  return state;
}

export class TickService {
  constructor(private store: EventStore) {}

  async emit(event: GameEvent): Promise<void> {
    await this.store.append(event);
  }

  async rebuild(): Promise<GameState> {
    const snapshot = await this.store.getSnapshot();
    let state: GameState = snapshot ?? { cycle: 0, resources: {} };
    const events = await this.store.loadEvents(state.cycle + 1);
    for (const e of events) {
      state = applyEvent(state, e);
    }
    return state;
  }

  async snapshot(state: GameState): Promise<void> {
    await this.store.saveSnapshot(state.cycle, state);
  }

  async replay(cycle: number): Promise<GameState> {
    const snapshot = await this.store.getSnapshot();
    let state: GameState = snapshot ?? { cycle: 0, resources: {} };
    const events = await this.store.loadEvents(state.cycle + 1);
    for (const e of events) {
      if (e.cycle > cycle) break;
      state = applyEvent(state, e);
    }
    return state;
  }
}

export type { GameState, ProposalAccepted, BuildingProduced, ResourcesUpdated };
