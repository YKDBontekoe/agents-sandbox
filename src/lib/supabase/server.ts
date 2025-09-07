import { createClient } from '@supabase/supabase-js'
import logger from '@/lib/logger'
import { resolve } from '@/infrastructure/container'
import type { Config } from '@/infrastructure/config'

// Server-side Supabase client using the service role key (never sent to the browser)
// Ensure these env vars are set in your environment (e.g., .env.local)
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export function createSupabaseServerClient() {
  const config = resolve<Config>('config')
  const url = config.supabaseUrl
  const serviceKey = config.supabaseServiceRoleKey

  if (!url || !serviceKey || url.includes('placeholder') || serviceKey.includes('placeholder')) {
    logger.error('Supabase configuration missing:', {
      hasUrl: !!url,
      hasServiceKey: !!serviceKey,
      urlContainsPlaceholder: url?.includes('placeholder'),
      serviceKeyContainsPlaceholder: serviceKey?.includes('placeholder')
    })
    throw new Error('Supabase not configured - check environment variables')
  }

  // Provide a fetch with timeout so DB issues fail fast instead of hanging
  const fetchWithTimeout = (timeoutMs: number): typeof fetch => {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetch(input as RequestInfo, { ...(init || {}), signal: controller.signal })
        return res
      } finally {
        clearTimeout(id)
      }
    }
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { fetch: fetchWithTimeout(6000) }, // 6s hard cap per request
  })
}
