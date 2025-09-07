import { NextRequest, NextResponse } from 'next/server'
import { generateMapChunk } from '@application'

// Enhanced chunk-based terrain generation with villages, rivers, and other features
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const chunkXParam = searchParams.get('chunkX')
  const chunkYParam = searchParams.get('chunkY')
  const chunkSizeParam = searchParams.get('chunkSize')
  const seedParam = searchParams.get('seed')

  const chunkX = Number(chunkXParam ?? 0)
  const chunkY = Number(chunkYParam ?? 0)
  const chunkSize = Math.max(8, Math.min(64, Number(chunkSizeParam ?? 16)))
  const seed = Number(seedParam ?? 12345)

  const chunk = generateMapChunk(chunkX, chunkY, chunkSize, seed)
  return NextResponse.json({ chunk })
}
