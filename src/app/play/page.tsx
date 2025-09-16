import type { ComponentProps } from 'react';
import PlayClient from './PlayClient';
import type PlayPage from './PlayPageInternal';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { config } from '@/infrastructure/config';

type PlayPageProps = ComponentProps<typeof PlayPage>;
type LoadedState = Exclude<PlayPageProps['initialState'], null | undefined>;
type LoadedProposals = NonNullable<PlayPageProps['initialProposals']>;
type ProposalItem = LoadedProposals[number];

interface GameStateRow extends LoadedState {
  created_at?: string;
  updated_at?: string;
}

interface ProposalRow extends ProposalItem {
  state_id: string;
  created_at?: string;
  updated_at?: string;
}

export default async function Page() {
  let initialState: PlayPageProps['initialState'] = null;
  let initialProposals: LoadedProposals = [];
  try {
    const supabase = createSupabaseServerClient(config);
    const { data: state } = await supabase
      .from('game_state')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const typedState: GameStateRow | null = state ?? null;

    if (typedState) {
      initialState = typedState;
      const { data: props } = await supabase
        .from('proposals')
        .select('*')
        .eq('state_id', typedState.id)
        .in('status', ['pending', 'accepted', 'rejected'])
        .order('created_at', { ascending: false });
      if (Array.isArray(props)) {
        const typedProposals: ProposalRow[] = props;
        initialProposals = typedProposals;
      }
    }
  } catch {
    // Leave initialState null; client will handle fallback
  }

  return <PlayClient initialState={initialState} initialProposals={initialProposals} />;
}

