import { NextResponse } from 'next/server'
import { commandBus } from '@/application/bus'
import { RunTickCommand } from '@/application/commands/runTick'

export async function POST() {
  try {
    const result = await commandBus.execute(new RunTickCommand())
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
