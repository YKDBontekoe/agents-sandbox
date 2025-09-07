import { NextResponse } from 'next/server'
import { heartbeatState } from '@application'

// Heartbeat: apply due ticks based on last_tick_at and tick_interval_ms
export async function POST() {
  try {
    const result = await heartbeatState()
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

