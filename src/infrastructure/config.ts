import { z } from 'zod';

const ConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  vercelEnv: z.string().default('local'),
  logLevel: z.string().default('error'),
  nextPublicSupabaseUrl: z.string().url(),
  nextPublicSupabaseAnonKey: z.string(),
  supabaseUrl: z.string().url(),
  supabaseServiceRoleKey: z.string(),
  supabaseJwtSecret: z.string(),
  openAiApiKey: z.string().optional(),
  nextPublicOfflineMode: z.boolean().default(false),
  nextPublicDisableRealtime: z.boolean().default(false)
});

export type Config = z.infer<typeof ConfigSchema>;

const defaults: Partial<Config> = {
  nodeEnv: 'development',
  vercelEnv: 'local',
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
  nextPublicOfflineMode: false,
  nextPublicDisableRealtime: false
};

const fromEnv: Partial<Config> = {
  nodeEnv: process.env.NODE_ENV as Config['nodeEnv'],
  vercelEnv: process.env.VERCEL_ENV,
  logLevel: process.env.NEXT_PUBLIC_LOG_LEVEL,
  nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  nextPublicSupabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET,
  openAiApiKey: process.env.OPENAI_API_KEY,
  nextPublicOfflineMode: process.env.NEXT_PUBLIC_OFFLINE_MODE === '1',
  nextPublicDisableRealtime: process.env.NEXT_PUBLIC_DISABLE_REALTIME === '1'
};

const ClientSchema = ConfigSchema.partial({
  supabaseUrl: true,
  supabaseServiceRoleKey: true,
  supabaseJwtSecret: true,
  openAiApiKey: true,
});

export function loadConfig(overrides: Partial<Config> = {}): Config {
  const base: Partial<Config> = { ...defaults, ...fromEnv, ...overrides };
  const isBrowser = typeof window !== 'undefined';
  const parsed = isBrowser ? ClientSchema.parse(base) : ConfigSchema.parse(base);
  return parsed as Config;
}

export const config = loadConfig();

export const publicConfig = {
  nodeEnv: config.nodeEnv,
  logLevel: config.logLevel,
  nextPublicSupabaseUrl: config.nextPublicSupabaseUrl,
  nextPublicSupabaseAnonKey: config.nextPublicSupabaseAnonKey,
  nextPublicOfflineMode: config.nextPublicOfflineMode,
  nextPublicDisableRealtime: config.nextPublicDisableRealtime,
};

export { ConfigSchema };
