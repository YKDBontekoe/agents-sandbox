import { GameState } from '../entities/GameState';
import { Proposal } from '../entities/Proposal';

export type ProposalGenerator = (state: GameState, guild: string) => Promise<Proposal[]>;

export async function generateProposals(
  state: GameState,
  guild: string,
  generator?: ProposalGenerator,
): Promise<Proposal[]> {
  if (generator) {
    return generator(state, guild);
  }

  const guildMap: Record<string, { title: string; desc: string; delta: Record<string, number> }[]> = {
    Wardens: [
      { title: 'Fortify the Outer Walls', desc: 'Repair battlements and station extra sentries along the perimeter.', delta: { threat: -3, unrest: -1, coin: -10 } },
      { title: 'Patrol the Wilds', desc: 'Sweep nearby forests for raiders and lurking beasts.', delta: { threat: -2, favor: +1, coin: -5 } },
    ],
    Alchemists: [
      { title: 'Distill Mana Salts', desc: 'Convert surplus reagents into refined mana for the leyworks.', delta: { mana: +15, coin: -10 } },
      { title: 'Fertilize the Fields', desc: 'Apply alchemical tonics to boost crop yield.', delta: { grain: +120, coin: -15 } },
    ],
    Scribes: [
      { title: 'Codex of Roads', desc: 'Standardize measures and repair key road segments to ease trade.', delta: { coin: +20, favor: +2, unrest: -1 } },
      { title: 'Archives Reordering', desc: 'Streamline record-keeping to reduce waste and duplication.', delta: { coin: +10, mana: +2 } },
    ],
    Stewards: [
      { title: 'Calm the Markets', desc: 'Institute fair pricing and resolve merchant disputes.', delta: { unrest: -3, favor: +2, coin: -5 } },
      { title: 'Civic Festival', desc: 'A modest festival to raise spirits and cohesion.', delta: { unrest: -2, favor: +3, coin: -8 } },
    ],
  };

  const picks = guildMap[guild] ?? guildMap['Wardens'];
  return picks.slice(0, 2).map((p) => ({
    guild,
    title: p.title,
    description: p.desc,
    predicted_delta: p.delta,
  }));
}
