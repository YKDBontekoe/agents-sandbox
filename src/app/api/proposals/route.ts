import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseUnitOfWork } from '@arcane/infrastructure/supabase'
import logger from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const uow = new SupabaseUnitOfWork(supabase)

    const state = await uow.gameStates.getLatest()
    if (!state) return NextResponse.json({ proposals: [] })

    const proposals = await uow.proposals.listByState(state.id, [
      'pending',
      'accepted',
      'rejected',
    ])

    return NextResponse.json({ proposals })
  } catch (error) {
    logger.error('Supabase connection error in proposals route:', error)
    return NextResponse.json(
      { error: 'Service unavailable - database not configured' },
      { status: 503 }
    )
  }
}
