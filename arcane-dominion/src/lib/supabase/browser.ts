import { createClient } from '@supabase/supabase-js'

// Client-side Supabase (anon key). Only use for non-sensitive data if needed.
// Prefer server routes for DB writes in this project.

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env variables')
  }

  return createClient(url, anonKey)
}