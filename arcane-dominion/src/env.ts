// Environment variable definitions for this project.
// Create a .env.local file at the project root with the following:
//
// SUPABASE_URL=... (project URL)
// SUPABASE_SERVICE_ROLE_KEY=... (service role key; server-side ONLY)
// NEXT_PUBLIC_SUPABASE_URL=... (same as SUPABASE_URL)
// NEXT_PUBLIC_SUPABASE_ANON_KEY=... (anon key for browser reads)
// OPENAI_API_KEY=... (for Vercel AI SDK provider)
//
// Never commit secrets. In production, set these via your hosting provider.
export const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'OPENAI_API_KEY',
] as const