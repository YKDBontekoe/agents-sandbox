import { createClient } from '@supabase/supabase-js'

// Client-side Supabase (anon key). Only use for non-sensitive data if needed.
// Prefer server routes for DB writes in this project.

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey || url.includes('placeholder') || anonKey.includes('placeholder')) {
    throw new Error('Supabase not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createClient(url, anonKey)
}