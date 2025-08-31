import { NextResponse } from 'next/server'

export async function GET() {
  const envStatus = {
    hasSupabaseUrl: !!process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder'),
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder'),
    hasSupabaseJwtSecret: !!process.env.SUPABASE_JWT_SECRET && !process.env.SUPABASE_JWT_SECRET.includes('placeholder'),
    hasOpenAiKey: !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('placeholder'),
    environment: process.env.NODE_ENV || 'unknown',
    vercelEnv: process.env.VERCEL_ENV || 'local'
  }

  return NextResponse.json(envStatus)
}