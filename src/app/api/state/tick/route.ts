import { NextResponse } from 'next/server'
import { tickState } from '@application'

// Advance one cycle: delegate to engine and persist results
export async function POST() {
  try {
    const result = await tickState()
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
