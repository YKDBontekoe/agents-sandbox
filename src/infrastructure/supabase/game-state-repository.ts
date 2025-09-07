import type { SupabaseClient } from '@supabase/supabase-js'
import { GameState, GameStateRepository } from '@arcane/domain/repositories/game-state-repository'

export class SupabaseGameStateRepository implements GameStateRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getLatest(): Promise<GameState | null> {
    const { data, error } = await this.client
      .from('game_state')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return (data as GameState) || null
  }

  async getById(id: string): Promise<GameState | null> {
    const { data, error } = await this.client.from('game_state').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return (data as GameState) || null
  }

  async create(state: Partial<GameState>): Promise<GameState> {
    const { data, error } = await this.client.from('game_state').insert(state).select('*').single()
    if (error) throw error
    return data as GameState
  }

  async update(id: string, updates: Partial<GameState>): Promise<GameState> {
    const { data, error } = await this.client
      .from('game_state')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as GameState
  }
}
