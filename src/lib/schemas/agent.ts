import { z } from 'zod';

const modelConfigSchema = z.object({
  provider: z.enum(['openai', 'azure-openai', 'openrouter']),
  apiKey: z.string(),
  model: z.string(),
  baseUrl: z.string().optional(),
  apiVersion: z.string().optional(),
});

export const agentSchema = z.object({
  name: z.string(),
  type: z.enum(['chat', 'voice']),
  description: z.string(),
  category: z.string(),
  systemPrompt: z.string(),
  modelConfig: modelConfigSchema,
  temperature: z.number(),
  maxTokens: z.number(),
  voiceSettings: z
    .object({
      voice: z.string(),
      speed: z.number(),
      pitch: z.number(),
    })
    .optional(),
  visibility: z.enum(['public', 'private']).optional(),
  screenshots: z.array(z.string()).optional(),
  rating: z.number().optional(),
});