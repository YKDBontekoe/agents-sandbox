import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client using the service role key (never sent to the browser)
// Ensure these env vars are set in your environment (e.g., .env.local)
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export function createSupabaseServerClient() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}