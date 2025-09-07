import { NextResponse } from 'next/server'
import { getDbHealth } from '@application'

export async function GET() {
  const result = await getDbHealth()
  const status = result.connected ? 200 : 503
  return NextResponse.json(result, { status })
}
