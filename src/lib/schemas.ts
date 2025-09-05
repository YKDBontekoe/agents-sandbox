import { z } from 'zod'

export const GameStateSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  cycle: z.number().int(),
  max_cycle: z.number().int(),
  resources: z.record(z.string(), z.number()),
  notes: z.string().nullable().optional(),
  workers: z.number().int(),
  buildings: z.array(z.unknown()),
  routes: z.array(z.unknown()),
  edicts: z.record(z.string(), z.number()),
  skills: z.array(z.string()),
  skill_tree_seed: z.number().int().nullable().optional(),
})
export type GameState = z.infer<typeof GameStateSchema>

export const ProposalSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  state_id: z.string().uuid(),
  guild: z.enum(['Wardens', 'Alchemists', 'Scribes', 'Stewards']),
  title: z.string(),
  description: z.string(),
  predicted_delta: z.record(z.string(), z.number()),
  status: z.enum(['pending', 'accepted', 'rejected', 'applied']),
})
export type Proposal = z.infer<typeof ProposalSchema>

export const AIProposalSchema = z.object({
  title: z.string(),
  description: z.string(),
  predicted_delta: z.record(z.string(), z.number()),
})
export type AIProposal = z.infer<typeof AIProposalSchema>

export const AIScrySchema = z.object({
  predicted_delta: z.record(z.string(), z.number()),
  risk_note: z.string(),
})
export type AIScry = z.infer<typeof AIScrySchema>
