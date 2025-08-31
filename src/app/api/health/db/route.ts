import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  // Only expose booleans and sanitized error messages
  const envStatus = {
    hasUrl: !!process.env.SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  }

  let supabase
  try {
    supabase = createSupabaseServerClient()
  } catch (err: any) {
    return NextResponse.json(
      {
        connected: false,
        env: envStatus,
        error: 'Supabase not configured or failed to initialize',
        details: err?.message || String(err),
      },
      { status: 503 }
    )
  }

  async function checkTable(name: string) {
    try {
      // Minimal, non-invasive check. head:true avoids body rows.
      const { error } = await supabase
        .from(name as any)
        .select('*', { head: true, count: 'exact' })
        .limit(1)

      if (error) {
        return { ok: false, error: error.message }
      }
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) }
    }
  }

  const [gameState, proposals, decisions] = await Promise.all([
    checkTable('game_state'),
    checkTable('proposals'),
    checkTable('decisions'),
  ])

  const allOk = gameState.ok && proposals.ok && decisions.ok

  return NextResponse.json({
    connected: true,
    env: envStatus,
    tables: {
      game_state: gameState,
      proposals: proposals,
      decisions: decisions,
    },
    healthy: allOk,
  })
}

