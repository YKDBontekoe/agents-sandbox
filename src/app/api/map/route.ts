import { NextRequest, NextResponse } from 'next/server'

// Returns a size x size grid of tile type strings
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sizeParam = searchParams.get('size')
  const seedParam = searchParams.get('seed')
  const size = Math.max(4, Math.min(100, Number(sizeParam ?? 20)))
  const seed = Number(seedParam ?? 12345)

  // Simple seeded RNG (mulberry32)
  function mulberry32(a: number) {
    return function() {
      let t = (a += 0x6d2b79f5)
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  const rng = mulberry32(seed)

  const map: string[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => 'grass'))

  // Add lakes
  const lakes = 1 + Math.floor(rng() * 3)
  for (let i = 0; i < lakes; i++) {
    const cx = Math.floor(rng() * size)
    const cy = Math.floor(rng() * size)
    const r = 2 + Math.floor(rng() * Math.max(2, size * 0.12))
    for (let y = Math.max(0, cy - r); y < Math.min(size, cy + r + 1); y++) {
      for (let x = Math.max(0, cx - r); x < Math.min(size, cx + r + 1); x++) {
        const dx = x - cx, dy = y - cy
        if (dx * dx + dy * dy <= r * r * (0.8 + rng() * 0.6)) map[y][x] = 'water'
      }
    }
  }

  // Add forest patches
  const forests = 1 + Math.floor(rng() * 4)
  for (let i = 0; i < forests; i++) {
    const cx = Math.floor(rng() * size)
    const cy = Math.floor(rng() * size)
    const r = 2 + Math.floor(rng() * Math.max(2, size * 0.15))
    for (let y = Math.max(0, cy - r); y < Math.min(size, cy + r + 1); y++) {
      for (let x = Math.max(0, cx - r); x < Math.min(size, cx + r + 1); x++) {
        if (map[y][x] !== 'grass') continue
        const dx = x - cx, dy = y - cy
        if (dx * dx + dy * dy <= r * r * (0.7 + rng() * 0.5)) map[y][x] = 'forest'
      }
    }
  }

  // Add mountain ridges near edges
  const ridges = 1 + Math.floor(rng() * 2)
  for (let i = 0; i < ridges; i++) {
    const vertical = rng() < 0.5
    const start = Math.floor(rng() * size)
    const len = Math.floor(size * (0.5 + rng() * 0.5))
    for (let k = 0; k < len; k++) {
      const t = k / len
      const x = vertical ? start : Math.floor(t * (size - 1))
      const y = vertical ? Math.floor(t * (size - 1)) : start
      if (map[y][x] === 'grass') map[y][x] = 'mountain'
    }
  }

  return NextResponse.json({ map })
}
