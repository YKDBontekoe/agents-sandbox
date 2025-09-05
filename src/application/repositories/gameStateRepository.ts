import { createSupabaseServerClient } from '@/lib/supabase/server'

export class GameStateRepository {
  async getLatest() {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('game_state')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  }

  async create() {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('game_state')
      .insert({ skill_tree_seed: Math.floor(Math.random() * 1e9) })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  async patchSkillTreeSeed(id: string) {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase
      .from('game_state')
      .update({ skill_tree_seed: Math.floor(Math.random() * 1e9) })
      .eq('id', id)
      .select('*')
      .maybeSingle()
    return data
  }
}
