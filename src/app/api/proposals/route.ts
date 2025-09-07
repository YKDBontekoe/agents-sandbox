import { NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { listProposals } from '@application'

export async function GET() {
  try {
    const proposals = await listProposals()
    return NextResponse.json({ proposals })
  } catch (error) {
    logger.error('Supabase connection error in proposals route:', error)
    return NextResponse.json(
      { error: 'Service unavailable - database not configured' },
      { status: 503 }
    )
  }
}
