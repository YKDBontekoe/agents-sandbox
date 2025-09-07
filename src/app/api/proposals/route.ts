import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseUnitOfWork } from '@/infrastructure/supabase/unit-of-work'
import logger from '@/lib/logger'
import { AppError } from '@logging'

export async function GET() {
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
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json(
      { error: 'Service unavailable - database not configured' },
      { status: 503 }
    )
  }
}
