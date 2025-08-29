import { z } from 'zod';
import { validateApiKey } from '@/lib/utils';

export const ModelConfigSchema = z.object({
  provider: z.enum(['openai', 'azure-openai', 'openrouter']),
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().min(1, 'Model is required'),
  baseUrl: z.string().optional(),
  apiVersion: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  maxRetries: z.number().int().nonnegative().optional(),
});

const VoiceSettingsSchema = z.object({
  voice: z.string(),
  speed: z.number(),
  pitch: z.number(),
});

const BaseAgentConfigSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Agent name is required'),
  type: z.enum(['chat', 'voice']),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  modelConfig: ModelConfigSchema,
  temperature: z.number(),
  maxTokens: z.number().int().positive(),
  voiceSettings: VoiceSettingsSchema.optional(),
  version: z.string().optional(),
  visibility: z.enum(['public', 'private']).optional(),
  screenshots: z.array(z.string()).optional(),
  rating: z.number().optional(),
  ratingCount: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const refineAgentSchema = (schema: typeof BaseAgentConfigSchema) =>
  schema.superRefine((data, ctx) => {
    if (!validateApiKey(data.modelConfig.provider, data.modelConfig.apiKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['modelConfig', 'apiKey'],
        message: 'Invalid API key format',
      });
    }
    if (
      data.modelConfig.provider === 'azure-openai' &&
      !data.modelConfig.baseUrl
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['modelConfig', 'baseUrl'],
        message: 'Base URL is required for Azure OpenAI',
      });
    }
    if (data.type === 'voice' && !data.voiceSettings) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['voiceSettings'],
        message: 'Voice settings are required for voice agents',
      });
    }
  });

export const AgentConfigSchema = refineAgentSchema(BaseAgentConfigSchema);
export const AgentConfigFormSchema = refineAgentSchema(
  BaseAgentConfigSchema.omit({ id: true, createdAt: true, updatedAt: true })
);

export type AgentConfigSchemaType = z.infer<typeof AgentConfigSchema>;
