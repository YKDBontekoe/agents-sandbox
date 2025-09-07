import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Config } from '@/infrastructure/config'

// Client-side Supabase (anon key). Only use for non-sensitive data if needed.
// Prefer server routes for DB writes in this project.

let cachedClient: SupabaseClient | null = null;

type PublicSupabaseConfig = Pick<Config, 'nextPublicSupabaseUrl' | 'nextPublicSupabaseAnonKey'>;

export function createSupabaseBrowserClient(config: PublicSupabaseConfig) {
  const url = config.nextPublicSupabaseUrl
  const anonKey = config.nextPublicSupabaseAnonKey

  if (!url || !anonKey || url.includes('placeholder') || anonKey.includes('placeholder')) {
    throw new Error('Supabase not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  // Add a modest timeout so client calls don’t hang the UI indefinitely
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

  if (cachedClient) return cachedClient;

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      storageKey: 'ad_anon',
    },
    global: { fetch: fetchWithTimeout(6000) }
  });
  return cachedClient;
}
