import { NextRequest, NextResponse } from 'next/server'

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

  // Enhanced seeded RNG (mulberry32)
  function mulberry32(a: number) {
    return function() {
      let t = (a += 0x6d2b79f5)
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  // Create chunk-specific seed based on position and global seed
  const chunkSeed = seed + chunkX * 1000 + chunkY * 1000000
  const rng = mulberry32(chunkSeed)

  // Initialize chunk with grass
  const chunk: string[][] = Array.from({ length: chunkSize }, () => 
    Array.from({ length: chunkSize }, () => 'grass')
  )

  // Biome determination based on chunk position
  const biomeRng = mulberry32(seed + Math.abs(chunkX) * 73 + Math.abs(chunkY) * 137)
  const biomeValue = biomeRng()
  let biome = 'temperate'
  if (biomeValue < 0.15) biome = 'desert'
  else if (biomeValue < 0.3) biome = 'tundra'
  else if (biomeValue < 0.45) biome = 'swamp'
  else if (biomeValue < 0.6) biome = 'mountains'
  else if (biomeValue < 0.75) biome = 'forest'

  // Base terrain based on biome
  if (biome === 'desert') {
    for (let y = 0; y < chunkSize; y++) {
      for (let x = 0; x < chunkSize; x++) {
        if (rng() < 0.7) chunk[y][x] = 'desert'
      }
    }
  } else if (biome === 'tundra') {
    for (let y = 0; y < chunkSize; y++) {
      for (let x = 0; x < chunkSize; x++) {
        if (rng() < 0.6) chunk[y][x] = 'tundra'
      }
    }
  } else if (biome === 'swamp') {
    for (let y = 0; y < chunkSize; y++) {
      for (let x = 0; x < chunkSize; x++) {
        if (rng() < 0.4) chunk[y][x] = 'swamp'
      }
    }
  }

  // Add water features (lakes, rivers)
  const waterFeatures = biome === 'desert' ? 0 : (biome === 'swamp' ? 3 : 1 + Math.floor(rng() * 2))
  for (let i = 0; i < waterFeatures; i++) {
    const cx = Math.floor(rng() * chunkSize)
    const cy = Math.floor(rng() * chunkSize)
    const r = 1 + Math.floor(rng() * Math.max(2, chunkSize * 0.15))
    
    for (let y = Math.max(0, cy - r); y < Math.min(chunkSize, cy + r + 1); y++) {
      for (let x = Math.max(0, cx - r); x < Math.min(chunkSize, cx + r + 1); x++) {
        const dx = x - cx, dy = y - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= r * (0.7 + rng() * 0.4)) {
          chunk[y][x] = 'water'
        }
      }
    }
  }

  // Add rivers (flowing across chunk)
  if (rng() < 0.3 && biome !== 'desert') {
    const riverDirection = rng() < 0.5 ? 'horizontal' : 'vertical'
    const riverPos = Math.floor(rng() * chunkSize)
    const riverWidth = 1 + Math.floor(rng() * 2)
    
    if (riverDirection === 'horizontal') {
      for (let x = 0; x < chunkSize; x++) {
        for (let w = 0; w < riverWidth; w++) {
          const y = Math.min(chunkSize - 1, riverPos + w)
          if (chunk[y][x] !== 'mountain') chunk[y][x] = 'water'
        }
      }
    } else {
      for (let y = 0; y < chunkSize; y++) {
        for (let w = 0; w < riverWidth; w++) {
          const x = Math.min(chunkSize - 1, riverPos + w)
          if (chunk[y][x] !== 'mountain') chunk[y][x] = 'water'
        }
      }
    }
  }

  // Add forest patches
  const forestDensity = biome === 'forest' ? 0.8 : (biome === 'desert' ? 0.05 : 0.3)
  if (rng() < forestDensity) {
    const forests = 1 + Math.floor(rng() * 3)
    for (let i = 0; i < forests; i++) {
      const cx = Math.floor(rng() * chunkSize)
      const cy = Math.floor(rng() * chunkSize)
      const r = 2 + Math.floor(rng() * Math.max(2, chunkSize * 0.2))
      
      for (let y = Math.max(0, cy - r); y < Math.min(chunkSize, cy + r + 1); y++) {
        for (let x = Math.max(0, cx - r); x < Math.min(chunkSize, cx + r + 1); x++) {
          if (chunk[y][x] !== 'water' && chunk[y][x] !== 'mountain') {
            const dx = x - cx, dy = y - cy
            if (dx * dx + dy * dy <= r * r * (0.6 + rng() * 0.5)) {
              chunk[y][x] = 'forest'
            }
          }
        }
      }
    }
  }

  // Add mountain ranges
  if (biome === 'mountains' || rng() < 0.4) {
    const mountains = biome === 'mountains' ? 2 + Math.floor(rng() * 3) : 1
    for (let i = 0; i < mountains; i++) {
      const cx = Math.floor(rng() * chunkSize)
      const cy = Math.floor(rng() * chunkSize)
      const r = 2 + Math.floor(rng() * Math.max(2, chunkSize * 0.18))
      
      for (let y = Math.max(0, cy - r); y < Math.min(chunkSize, cy + r + 1); y++) {
        for (let x = Math.max(0, cx - r); x < Math.min(chunkSize, cx + r + 1); x++) {
          const dx = x - cx, dy = y - cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= r * (0.5 + rng() * 0.4)) {
            chunk[y][x] = 'mountain'
          }
        }
      }
    }
  }

  // Add villages (rare but interesting)
  const villageChance = biome === 'desert' ? 0.02 : (biome === 'mountains' ? 0.03 : 0.05)
  if (rng() < villageChance) {
    // Find suitable location for village (not on water/mountain)
    let attempts = 0
    while (attempts < 20) {
      const vx = 2 + Math.floor(rng() * (chunkSize - 4))
      const vy = 2 + Math.floor(rng() * (chunkSize - 4))
      
      if (chunk[vy][vx] === 'grass' || chunk[vy][vx] === 'forest') {
        // Create village center
        chunk[vy][vx] = 'village'
        
        // Add surrounding village tiles
        const villageSize = 1 + Math.floor(rng() * 3)
        for (let dy = -villageSize; dy <= villageSize; dy++) {
          for (let dx = -villageSize; dx <= villageSize; dx++) {
            const nx = vx + dx, ny = vy + dy
            if (nx >= 0 && nx < chunkSize && ny >= 0 && ny < chunkSize) {
              if (Math.abs(dx) + Math.abs(dy) <= villageSize && rng() < 0.6) {
                if (chunk[ny][nx] !== 'water' && chunk[ny][nx] !== 'mountain') {
                  chunk[ny][nx] = dx === 0 && dy === 0 ? 'village' : 'village_outskirt'
                }
              }
            }
          }
        }
        break
      }
      attempts++
    }
  }

  // Add ruins (ancient structures)
  if (rng() < 0.08) {
    let attempts = 0
    while (attempts < 15) {
      const rx = Math.floor(rng() * chunkSize)
      const ry = Math.floor(rng() * chunkSize)
      
      if (chunk[ry][rx] === 'grass' || chunk[ry][rx] === 'desert') {
        chunk[ry][rx] = 'ruins'
        break
      }
      attempts++
    }
  }

  // Add special resources
  const resourceChance = 0.1
  if (rng() < resourceChance) {
    let attempts = 0
    while (attempts < 10) {
      const rx = Math.floor(rng() * chunkSize)
      const ry = Math.floor(rng() * chunkSize)
      
      if (chunk[ry][rx] === 'mountain') {
        chunk[ry][rx] = rng() < 0.5 ? 'iron_deposit' : 'gold_deposit'
        break
      } else if (chunk[ry][rx] === 'forest') {
        chunk[ry][rx] = 'rare_herbs'
        break
      }
      attempts++
    }
  }

  // Add roads connecting villages or important features
  const hasVillage = chunk.some(row => row.some(cell => cell === 'village'))
  if (hasVillage && rng() < 0.7) {
    // Simple road generation (could be enhanced)
    const roadDirection = rng() < 0.5 ? 'horizontal' : 'vertical'
    const roadPos = Math.floor(rng() * chunkSize)
    
    if (roadDirection === 'horizontal') {
      for (let x = 0; x < chunkSize; x++) {
        if (chunk[roadPos][x] === 'grass' || chunk[roadPos][x] === 'village_outskirt') {
          chunk[roadPos][x] = 'road'
        }
      }
    } else {
      for (let y = 0; y < chunkSize; y++) {
        if (chunk[y][roadPos] === 'grass' || chunk[y][roadPos] === 'village_outskirt') {
          chunk[y][roadPos] = 'road'
        }
      }
    }
  }

  return NextResponse.json({ 
    chunk, 
    chunkX, 
    chunkY, 
    chunkSize,
    biome,
    metadata: {
      hasVillage: chunk.some(row => row.some(cell => cell === 'village')),
      hasRuins: chunk.some(row => row.some(cell => cell === 'ruins')),
      hasSpecialResources: chunk.some(row => row.some(cell => 
        ['iron_deposit', 'gold_deposit', 'rare_herbs'].includes(cell)
      )),
      waterCoverage: chunk.flat().filter(cell => cell === 'water').length / (chunkSize * chunkSize),
      forestCoverage: chunk.flat().filter(cell => cell === 'forest').length / (chunkSize * chunkSize)
    }
  })
}