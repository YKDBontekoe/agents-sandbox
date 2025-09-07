import { config } from '@/infrastructure/config'

export function getEnvStatus() {
  return {
    hasSupabaseUrl: !!config.supabaseUrl && !config.supabaseUrl.includes('placeholder'),
    hasSupabaseServiceKey: !!config.supabaseServiceRoleKey && !config.supabaseServiceRoleKey.includes('placeholder'),
    hasSupabaseJwtSecret: !!config.supabaseJwtSecret && !config.supabaseJwtSecret.includes('placeholder'),
    hasOpenAiKey: !!config.openAiApiKey && !config.openAiApiKey.includes('placeholder'),
    environment: config.nodeEnv || 'unknown',
    vercelEnv: config.vercelEnv || 'local',
  }
}

