import PlayClient from './PlayClient';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface GameStateRow {
  id: string;
  cycle: number;
  resources: Record<string, number>;
  workers?: number;
  buildings?: unknown[];
}

export default async function Page() {
  let initialState: GameStateRow | null = null;
  let initialProposals: any[] = [];
  try {
    const supabase = createSupabaseServerClient();
    const { data: state } = await supabase
      .from('game_state')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    initialState = (state as GameStateRow) || null;

    if (initialState) {
      const { data: props } = await supabase
        .from('proposals')
        .select('*')
        .eq('state_id', initialState.id)
        .in('status', ['pending', 'accepted', 'rejected'])
        .order('created_at', { ascending: false });
      initialProposals = props || [];
    }
  } catch {
    // Leave initialState null; client will handle fallback
  }

  return <PlayClient initialState={initialState as any} initialProposals={initialProposals as any} />;
}

