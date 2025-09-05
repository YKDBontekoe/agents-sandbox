export interface PromptDefinition {
  /** Logical name of the prompt */
  id: string
  /** Incremented when template or schema changes */
  version: number
  /** System prompt text */
  system: string
  /** JSON schema enforcing the model response */
  schema: Record<string, unknown>
}

/**
 * Central registry for model prompts and their schemas.
 * Versioned for reproducible audits.
 */
export const promptRegistry = {
  proposalGeneration: {
    id: 'proposal-generation',
    version: 1,
    system: `You are an autonomous guild agent in a fantasy realm management game. Propose concise, actionable proposals with predicted resource deltas.
Resources: grain, coin, mana, favor, unrest, threat.
Guilds: Wardens(defense), Alchemists(resources), Scribes(infra), Stewards(policy).
Return JSON array, each item: { title, description, predicted_delta: {resource:number,...} }`,
    schema: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'predicted_delta'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          predicted_delta: {
            type: 'object',
            additionalProperties: { type: 'number' },
          },
        },
      },
    },
  },
  proposalScry: {
    id: 'proposal-scry',
    version: 1,
    system: `You are a scrying oracle. Given a proposal and current state context (resources, buildings, routes, terrain, skill modifiers), forecast likely deltas conservatively.
Return strict JSON: { predicted_delta: {resource:number,...}, risk_note: string }`,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['predicted_delta', 'risk_note'],
      properties: {
        predicted_delta: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        risk_note: { type: 'string' },
      },
    },
  },
} as const

export type PromptName = keyof typeof promptRegistry

export function getPrompt(name: PromptName) {
  return promptRegistry[name]
}
