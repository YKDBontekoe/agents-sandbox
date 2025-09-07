import { NextResponse } from 'next/server'
import { getEnvStatus } from '@application'

export async function GET() {
  const envStatus = getEnvStatus()
  return NextResponse.json(envStatus)
}
