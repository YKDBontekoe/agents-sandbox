import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Lightweight tilemap generator for the /play scene
// Returns a size x size grid of tile type strings
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sizeParam = searchParams.get('size')
  const size = Math.max(8, Math.min(64, Number(sizeParam || 20) || 20))

  // Simple deterministic pattern with some water bands and rocky corners
  const types = ['grass', 'grass', 'grass', 'water', 'mountain'] as const
  const map: string[][] = Array.from({ length: size }, (_, y) => {
    return Array.from({ length: size }, (_, x) => {
      // Create gentle water bands and some mountains near edges
      const edgeFactor = Math.max(0, 6 - Math.min(x, y, size - 1 - x, size - 1 - y))
      const waterBand = ((x + y) % 9 === 0) || ((x - y + 9999) % 11 === 0)
      if (edgeFactor >= 5) return 'mountain'
      if (waterBand && edgeFactor < 4) return 'water'
      return 'grass'
    })
  })

  return NextResponse.json({ map })
}
