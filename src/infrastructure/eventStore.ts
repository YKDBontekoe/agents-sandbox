import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GameEvent } from '@/domain/events';

export interface GameState {
  cycle: number;
  resources: Record<string, number>;
}

export interface EventStore {
  append(event: GameEvent): Promise<void>;
  loadEvents(fromCycle?: number): Promise<GameEvent[]>;
  saveSnapshot(cycle: number, state: GameState): Promise<void>;
  getSnapshot(cycle?: number): Promise<GameState | null>;
}

export class SupabaseEventStore implements EventStore {
  private client = createSupabaseServerClient();

  async append(event: GameEvent): Promise<void> {
    await this.client.from('events').insert({
      type: event.type,
      cycle: event.cycle,
      timestamp: event.timestamp,
      payload: event,
    });
  }

  async loadEvents(fromCycle = 0): Promise<GameEvent[]> {
    const { data } = await this.client
      .from('events')
      .select('payload')
      .gte('cycle', fromCycle)
      .order('cycle', { ascending: true });
    return (data ?? []).map((r: { payload: GameEvent }) => r.payload as GameEvent);
  }

  async saveSnapshot(cycle: number, state: GameState): Promise<void> {
    await this.client
      .from('event_snapshots')
      .upsert({ cycle, state }, { onConflict: 'cycle' });
  }

  async getSnapshot(cycle?: number): Promise<GameState | null> {
    let query = this.client
      .from('event_snapshots')
      .select('state, cycle')
      .order('cycle', { ascending: false })
      .limit(1);
    if (typeof cycle === 'number') query = query.eq('cycle', cycle);
    const { data } = await query.maybeSingle();
    return (data?.state as GameState) ?? null;
  }
}
