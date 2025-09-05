import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { config } from '@/infrastructure/config'

export async function GET() {
  // Only expose booleans and sanitized error messages
  const envStatus = {
    hasUrl: !!config.supabaseUrl,
    hasServiceKey: !!config.supabaseServiceRoleKey,
  }

  let supabase: SupabaseClient
  try {
    supabase = createSupabaseServerClient()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        connected: false,
        env: envStatus,
        error: 'Supabase not configured or failed to initialize',
        details: message,
      },
      { status: 503 }
    )
  }

  async function checkTable(name: string) {
    try {
      // Minimal, non-invasive check. head:true avoids body rows.
      const { error } = await supabase
        .from(name)
        .select('*', { head: true, count: 'exact' })
        .limit(1)

      if (error) {
        return { ok: false, error: error.message }
      }
      return { ok: true }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      return { ok: false, error: message }
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
