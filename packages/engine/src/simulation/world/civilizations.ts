export type CivilizationTemperament = 'stoic' | 'warlike' | 'mercantile' | 'mystic' | 'diplomatic'

export type RelationshipStatus = 'self' | 'ally' | 'friendly' | 'neutral' | 'wary' | 'hostile'

export type RelationshipTrend = 'improving' | 'declining' | 'stable'

export interface CivilizationResources {
  grain: number
  coin: number
  mana: number
  favor: number
  influence: number
}

export interface CivilizationTreaty {
  id: string
  with: string
  type: 'trade' | 'research' | 'defense'
  strength: number
  sinceCycle: number
  expiresCycle?: number | null
}

export interface CivilizationRelation {
  target: string
  attitude: number
  status: RelationshipStatus
  trend: RelationshipTrend
  lastShiftCycle: number
}

export interface CivilizationState {
  id: string
  name: string
  color: string
  emblem: string
  temperament: CivilizationTemperament
  origin: { chunkX: number; chunkY: number }
  resources: CivilizationResources
  treaties: CivilizationTreaty[]
  relations: Record<string, CivilizationRelation>
}

export interface CivilizationWorldState {
  seed: number
  createdAt: number
  lastUpdatedAt: number
  attitudeCycle: number
  civilizations: Record<string, CivilizationState>
  randomCursor: number
}

export interface CivilizationInfluence {
  civilization: CivilizationState
  influence: number
  relationship: CivilizationRelation | null
}

export interface CivilizationSummary {
  id: string
  name: string
  color: string
  emblem: string
  temperament: CivilizationTemperament
  origin: { chunkX: number; chunkY: number }
  resources: CivilizationResources
  relationship: CivilizationRelation
  treaties: CivilizationTreaty[]
}

export type DiplomaticActionKind = 'gift' | 'threaten' | 'forge_pact'

export interface DiplomaticActionRequest {
  actorId: string
  targetId: string
  action: DiplomaticActionKind
}

export interface DiplomaticActionResult {
  actor: CivilizationState
  target: CivilizationState
  relationship: CivilizationRelation
  description: string
}

export const PLAYER_REALM_ID = 'arcane-dominion'

const GLOBAL_CACHE_KEY = '__arcaneCivilizationWorlds__'

function ensureGlobalCache(): Map<number, CivilizationWorldState> {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_CACHE_KEY]?: Map<number, CivilizationWorldState>
  }
  if (!g[GLOBAL_CACHE_KEY]) {
    g[GLOBAL_CACHE_KEY] = new Map<number, CivilizationWorldState>()
  }
  return g[GLOBAL_CACHE_KEY]!
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  const idx = Math.floor(rng() * items.length)
  return items[idx]
}

function clampAttitude(value: number): number {
  return Math.max(-100, Math.min(100, Math.round(value)))
}

function statusFromAttitude(attitude: number, isSelf: boolean): RelationshipStatus {
  if (isSelf) return 'self'
  if (attitude >= 60) return 'ally'
  if (attitude >= 25) return 'friendly'
  if (attitude >= -10) return 'neutral'
  if (attitude >= -45) return 'wary'
  return 'hostile'
}

function trendFromDelta(delta: number): RelationshipTrend {
  if (delta > 2) return 'improving'
  if (delta < -2) return 'declining'
  return 'stable'
}

function createCivilizationRelation(
  targetId: string,
  attitude: number,
  cycle: number,
  isSelf: boolean
): CivilizationRelation {
  const normalized = clampAttitude(attitude)
  return {
    target: targetId,
    attitude: normalized,
    status: statusFromAttitude(normalized, isSelf),
    trend: 'stable',
    lastShiftCycle: cycle
  }
}

function seededName(rng: () => number): string {
  const titles = ['Consortium', 'Dominion', 'League', 'Compact', 'Covenant', 'Syndicate', 'Collective'] as const
  const adjectives = ['Verdant', 'Gilded', 'Storm', 'Shimmering', 'Iron', 'Silent', 'Luminous', 'Umbral'] as const
  const nouns = ['Throne', 'Spire', 'Enclave', 'Marches', 'Bastion', 'Conclave', 'Reach', 'Tribunal'] as const
  return `${pick(rng, adjectives)} ${pick(rng, nouns)} ${pick(rng, titles)}`
}

function seededColor(rng: () => number): string {
  const palette = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#facc15', '#14b8a6'] as const
  return pick(rng, palette)
}

function seededTemperament(rng: () => number): CivilizationTemperament {
  return pick(rng, ['stoic', 'warlike', 'mercantile', 'mystic', 'diplomatic'] as const)
}

function baseResourcesForTemperament(temperament: CivilizationTemperament, rng: () => number): CivilizationResources {
  const base: CivilizationResources = {
    grain: 400 + Math.round(rng() * 200),
    coin: 300 + Math.round(rng() * 250),
    mana: 150 + Math.round(rng() * 120),
    favor: 40 + Math.round(rng() * 40),
    influence: 60 + Math.round(rng() * 35)
  }

  switch (temperament) {
    case 'warlike':
      base.coin += 60
      base.influence += 15
      break
    case 'mercantile':
      base.coin += 120
      base.grain += 40
      break
    case 'mystic':
      base.mana += 90
      base.favor += 20
      break
    case 'diplomatic':
      base.favor += 35
      base.influence += 20
      break
    case 'stoic':
    default:
      base.grain += 60
      base.influence += 5
      break
  }

  return base
}

function createCivilization(
  rng: () => number,
  id: string,
  origin: { chunkX: number; chunkY: number },
  temperamentOverride?: CivilizationTemperament
): CivilizationState {
  const temperament = temperamentOverride ?? seededTemperament(rng)
  const resources = baseResourcesForTemperament(temperament, rng)
  return {
    id,
    name: seededName(rng),
    color: seededColor(rng),
    emblem: computeEmblem(`${id}:${resources.influence}:${temperament}`),
    temperament,
    origin,
    resources,
    treaties: [],
    relations: {}
  }
}

function createWorld(seed: number): CivilizationWorldState {
  const rng = mulberry32(seed ^ 0x9e3779b1)
  const now = Date.now()
  const civCount = 3 + Math.floor(rng() * 3)
  const world: CivilizationWorldState = {
    seed,
    createdAt: now,
    lastUpdatedAt: now,
    attitudeCycle: 0,
    civilizations: {},
    randomCursor: seed ^ 0x51f0ad1c
  }

  // Player realm anchored at origin
  const player = createCivilization(() => 0.42, PLAYER_REALM_ID, { chunkX: 0, chunkY: 0 }, 'stoic')
  player.name = 'Arcane Dominion'
  player.color = '#2563eb'
  player.resources = {
    grain: 900,
    coin: 650,
    mana: 320,
    favor: 80,
    influence: 95
  }
  player.treaties = []
  world.civilizations[player.id] = player

  const angleStep = (Math.PI * 2) / civCount
  const radiusBase = 6 + rng() * 3

  for (let i = 0; i < civCount; i += 1) {
    const angle = (i * angleStep) + rng() * 0.35
    const distance = radiusBase + rng() * 6
    const origin = {
      chunkX: Math.round(Math.cos(angle) * distance),
      chunkY: Math.round(Math.sin(angle) * distance)
    }
    const civ = createCivilization(rng, `civ-${seed}-${i}`, origin)
    world.civilizations[civ.id] = civ
  }

  // Seed bilateral relations
  const civs = Object.values(world.civilizations)
  for (const source of civs) {
    for (const target of civs) {
      if (source.id === target.id) continue
      if (source.relations[target.id]) continue
      const baseAttitude = (() => {
        let baseline = 10 + (rng() * 40)
        if (source.temperament === 'warlike') baseline -= 30
        if (source.temperament === 'diplomatic') baseline += 15
        if (target.temperament === 'mercantile' && source.temperament === 'mercantile') baseline += 10
        if (target.temperament === 'warlike' && source.temperament !== 'warlike') baseline -= 10
        return baseline
      })()
      const relation = createCivilizationRelation(target.id, baseAttitude, 0, target.id === PLAYER_REALM_ID && source.id === PLAYER_REALM_ID)
      source.relations[target.id] = relation
    }
  }

  return world
}

function getRandom(world: CivilizationWorldState): number {
  const rng = mulberry32(world.randomCursor)
  const value = rng()
  world.randomCursor = Math.floor(value * 2 ** 31)
  return value
}

function computeEmblem(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash.toString(16).padStart(6, '0').slice(0, 6)
}

function generateTreatyId(world: CivilizationWorldState): string {
  const value = Math.floor(getRandom(world) * 0xffffff)
  return `treaty-${world.seed.toString(16)}-${value.toString(16).padStart(6, '0')}`
}

function applyAttitudeShift(world: CivilizationWorldState) {
  const civs = Object.values(world.civilizations)
  if (civs.length <= 1) return
  for (const civ of civs) {
    for (const relation of Object.values(civ.relations)) {
      const target = world.civilizations[relation.target]
      if (!target) continue
      const randomDrift = (getRandom(world) - 0.5) * 6
      let temperamentBias = 0
      switch (civ.temperament) {
        case 'warlike': temperamentBias = -3; break
        case 'mercantile': temperamentBias = 2; break
        case 'mystic': temperamentBias = getRandom(world) > 0.7 ? 4 : -1; break
        case 'diplomatic': temperamentBias = 3; break
        default: temperamentBias = 1; break
      }
      const treatyBoost = civ.treaties.some(t => t.with === target.id) ? 4 : 0
      const delta = randomDrift + temperamentBias + treatyBoost
      updateRelationship(world, civ.id, target.id, delta, world.attitudeCycle + 1)
    }
  }
  world.attitudeCycle += 1
}

export function getCivilizationWorld(seed: number): CivilizationWorldState {
  const cache = ensureGlobalCache()
  let world = cache.get(seed)
  if (!world) {
    world = createWorld(seed)
    cache.set(seed, world)
  }
  return world
}

export function stepCivilizationWorld(world: CivilizationWorldState, now: number = Date.now()) {
  const elapsedMs = now - world.lastUpdatedAt
  if (elapsedMs <= 0) return
  const STEPS_PER_MS = 1 / (1000 * 60 * 5) // approx every 5 minutes
  const steps = Math.floor(elapsedMs * STEPS_PER_MS)
  for (let i = 0; i < steps; i += 1) {
    applyAttitudeShift(world)
    for (const civ of Object.values(world.civilizations)) {
      civ.resources.grain = Math.max(0, Math.round(civ.resources.grain + (getRandom(world) - 0.45) * 5))
      civ.resources.coin = Math.max(0, Math.round(civ.resources.coin + (getRandom(world) - 0.5) * 7))
      civ.resources.mana = Math.max(0, Math.round(civ.resources.mana + (getRandom(world) - 0.48) * 4))
      civ.resources.favor = Math.max(0, Math.round(civ.resources.favor + (getRandom(world) - 0.47) * 3))
      civ.resources.influence = Math.max(20, Math.round(civ.resources.influence + (getRandom(world) - 0.52) * 2))
    }
  }
  world.lastUpdatedAt = now
}

function influenceRadius(civ: CivilizationState): number {
  const base = 6 + civ.resources.influence / 25
  const temperamentBonus = civ.temperament === 'warlike' ? 2 : civ.temperament === 'diplomatic' ? 1.5 : 1
  return base * temperamentBonus
}

export function getChunkInfluence(
  world: CivilizationWorldState,
  chunkX: number,
  chunkY: number,
  focusId: string = PLAYER_REALM_ID
): CivilizationInfluence | null {
  const civs = Object.values(world.civilizations)
  if (civs.length === 0) return null
  let winner: CivilizationState | null = null
  let bestInfluence = -Infinity
  for (const civ of civs) {
    const dx = chunkX - civ.origin.chunkX
    const dy = chunkY - civ.origin.chunkY
    const dist = Math.hypot(dx, dy)
    const radius = influenceRadius(civ)
    const raw = Math.max(0, 1 - dist / Math.max(radius, 1))
    const influence = raw ** 1.35 * civ.resources.influence * 0.01
    if (influence > bestInfluence) {
      bestInfluence = influence
      winner = civ
    }
  }
  if (!winner) return null
  const relation = winner.id === focusId ? createCivilizationRelation(focusId, 100, world.attitudeCycle, true)
    : world.civilizations[focusId]?.relations[winner.id] ?? null
  return {
    civilization: winner,
    influence: Number(Math.max(0, bestInfluence).toFixed(3)),
    relationship: relation
  }
}

export function summarizeCivilizations(
  world: CivilizationWorldState,
  focusId: string = PLAYER_REALM_ID
): CivilizationSummary[] {
  return Object.values(world.civilizations)
    .map((civ) => {
      const relation = civ.id === focusId
        ? createCivilizationRelation(focusId, 100, world.attitudeCycle, true)
        : world.civilizations[focusId]?.relations[civ.id] ?? createCivilizationRelation(civ.id, 0, world.attitudeCycle, false)
      return {
        id: civ.id,
        name: civ.name,
        color: civ.color,
        emblem: civ.emblem,
        temperament: civ.temperament,
        origin: civ.origin,
        resources: { ...civ.resources },
        relationship: relation,
        treaties: civ.treaties.filter(t => t.with === focusId)
      }
    })
    .sort((a, b) => (a.id === focusId ? -1 : b.id === focusId ? 1 : b.relationship.attitude - a.relationship.attitude))
}

export function updateRelationship(
  world: CivilizationWorldState,
  sourceId: string,
  targetId: string,
  delta: number,
  cycle: number
): CivilizationRelation {
  const source = world.civilizations[sourceId]
  const target = world.civilizations[targetId]
  if (!source || !target) {
    throw new Error(`Cannot update relationship for unknown civilizations: ${sourceId} -> ${targetId}`)
  }
  const prev = source.relations[targetId] ?? createCivilizationRelation(targetId, 0, cycle, targetId === sourceId)
  const nextAttitude = clampAttitude(prev.attitude + delta)
  const status = statusFromAttitude(nextAttitude, targetId === sourceId)
  const trend = trendFromDelta(nextAttitude - prev.attitude)
  const updated: CivilizationRelation = {
    target: targetId,
    attitude: nextAttitude,
    status,
    trend,
    lastShiftCycle: cycle
  }
  source.relations[targetId] = updated
  if (targetId !== sourceId) {
    const reciprocalPrev = target.relations[sourceId] ?? createCivilizationRelation(sourceId, 0, cycle, sourceId === targetId)
    const reciprocalNext = clampAttitude(reciprocalPrev.attitude + delta * 0.8)
    const reciprocalStatus = statusFromAttitude(reciprocalNext, sourceId === targetId)
    const reciprocalTrend = trendFromDelta(reciprocalNext - reciprocalPrev.attitude)
    target.relations[sourceId] = {
      target: sourceId,
      attitude: reciprocalNext,
      status: reciprocalStatus,
      trend: reciprocalTrend,
      lastShiftCycle: cycle
    }
  }
  return updated
}

export function adjustCivilizationResources(
  world: CivilizationWorldState,
  civId: string,
  delta: Partial<CivilizationResources>
) {
  const civ = world.civilizations[civId]
  if (!civ) {
    throw new Error(`Unknown civilization: ${civId}`)
  }
  const resources = civ.resources
  for (const [key, value] of Object.entries(delta)) {
    const resKey = key as keyof CivilizationResources
    const cur = Number(resources[resKey] ?? 0)
    const change = Number(value ?? 0)
    resources[resKey] = Math.max(0, Math.round(cur + change))
  }
}

export function recordTreaty(
  world: CivilizationWorldState,
  civId: string,
  treaty: CivilizationTreaty
) {
  const civ = world.civilizations[civId]
  if (!civ) throw new Error(`Unknown civilization: ${civId}`)
  const existing = civ.treaties.find(t => t.id === treaty.id)
  if (existing) {
    Object.assign(existing, treaty)
  } else {
    civ.treaties.push(treaty)
  }
}

export function applyDiplomaticAction(
  world: CivilizationWorldState,
  request: DiplomaticActionRequest,
  cycle: number
): DiplomaticActionResult {
  const { actorId, targetId, action } = request
  const actor = world.civilizations[actorId]
  const target = world.civilizations[targetId]
  if (!actor || !target) {
    throw new Error(`Unknown civilizations for diplomatic action: ${actorId}, ${targetId}`)
  }

  let description = ''
  switch (action) {
    case 'gift': {
      const gift = 75
      adjustCivilizationResources(world, actorId, { coin: -gift })
      adjustCivilizationResources(world, targetId, { coin: gift })
      const relation = updateRelationship(world, actorId, targetId, 12 + getRandom(world) * 6, cycle)
      description = `${actor.name} extends tribute to ${target.name}, warming relations.`
      return { actor, target, relationship: relation, description }
    }
    case 'threaten': {
      adjustCivilizationResources(world, actorId, { influence: 3 })
      const relation = updateRelationship(world, actorId, targetId, -18 + getRandom(world) * -4, cycle)
      description = `${actor.name} issues a stern warning to ${target.name}. Tensions rise.`
      return { actor, target, relationship: relation, description }
    }
    case 'forge_pact': {
      const treatyId = generateTreatyId(world)
      const treaty: CivilizationTreaty = {
        id: treatyId,
        with: targetId,
        type: 'defense',
        strength: 1,
        sinceCycle: cycle,
        expiresCycle: cycle + 12
      }
      recordTreaty(world, actorId, treaty)
      recordTreaty(world, targetId, { ...treaty, with: actorId })
      const relation = updateRelationship(world, actorId, targetId, 20, cycle)
      adjustCivilizationResources(world, actorId, { favor: 10 })
      adjustCivilizationResources(world, targetId, { favor: 10 })
      description = `${actor.name} forges a mutual defense pact with ${target.name}.`
      return { actor, target, relationship: relation, description }
    }
    default:
      throw new Error(`Unsupported diplomatic action: ${action satisfies never}`)
  }
}
