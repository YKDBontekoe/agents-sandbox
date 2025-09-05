import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { z } from 'zod';
import { GameState } from '@/domain/entities/GameState';
import { Proposal } from '@/domain/entities/Proposal';
import { buildGameContext } from '@/lib/gameContext';

export function createOpenAIProposalGenerator() {
  const apiKey = process.env.OPENAI_API_KEY;
  const hasOpenAI = apiKey &&
    !apiKey.includes('your_openai_api_key_here') &&
    !apiKey.toLowerCase().includes('placeholder');
  if (!hasOpenAI) return null;
  const openai = createOpenAI({ apiKey });

  const ProposalSchema = z.object({
    title: z.string(),
    description: z.string(),
    predicted_delta: z.record(z.string(), z.number()),
  });
  const AIResponseSchema = z.array(ProposalSchema);

  return async function generate(state: GameState, guild: string): Promise<Proposal[]> {
    const system = `You are an autonomous guild agent in a fantasy realm management game. Propose concise, actionable proposals with predicted resource deltas.\nResources: grain, coin, mana, favor, unrest, threat.\nGuilds: Wardens(defense), Alchemists(resources), Scribes(infra), Stewards(policy).\nReturn JSON array, each item: { title, description, predicted_delta: {resource:number,...} }`;
    const gameContext = buildGameContext(state as any);
    const context = {
      cycle: state.cycle,
      resources: state.resources,
      guild,
      skill_tree_seed: (state as any).skill_tree_seed ?? 12345,
      ...gameContext,
    };
    const user = `Context: ${JSON.stringify(context)}\nGenerate 2 proposals rooted in this guild focus and the game's tone. Keep predicted_delta conservative and numeric. JSON only.`;
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system,
      prompt: user,
    });
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']') + 1;
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd));
    const proposals = AIResponseSchema.parse(parsed);
    return proposals.map((p) => ({
      guild,
      title: p.title,
      description: p.description,
      predicted_delta: p.predicted_delta,
    }));
  };
}
