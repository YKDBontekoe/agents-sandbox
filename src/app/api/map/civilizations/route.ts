import { NextRequest, NextResponse } from 'next/server'
import {
  PLAYER_REALM_ID,
  applyDiplomaticAction,
  getCivilizationWorld,
  stepCivilizationWorld,
  summarizeCivilizations,
  type DiplomaticActionKind,
} from '@engine/simulation/world/civilizations'

function parseSeed(value: string | null): number {
  if (!value) return 12345
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 12345
}

function jsonResponse(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const seed = parseSeed(searchParams.get('seed') ?? searchParams.get('worldSeed'))
  const world = getCivilizationWorld(seed)
  stepCivilizationWorld(world)
  return jsonResponse({
    civilizations: summarizeCivilizations(world, PLAYER_REALM_ID),
    attitudeCycle: world.attitudeCycle,
    updatedAt: world.lastUpdatedAt,
  })
}

export async function POST(req: NextRequest) {
  let payload: { seed?: number; targetId?: string; action?: DiplomaticActionKind } | null = null
  try {
    payload = await req.json()
  } catch (error) {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!payload || typeof payload !== 'object') {
    return jsonResponse({ error: 'Request body required' }, { status: 400 })
  }

  const seed = typeof payload.seed === 'number' && Number.isFinite(payload.seed)
    ? payload.seed
    : 12345
  const targetId = typeof payload.targetId === 'string' && payload.targetId.trim().length > 0
    ? payload.targetId.trim()
    : null
  const action = payload.action
  const allowedActions: DiplomaticActionKind[] = ['gift', 'threaten', 'forge_pact']

  if (!targetId || !action || !allowedActions.includes(action)) {
    return jsonResponse({ error: 'targetId and action are required' }, { status: 400 })
  }

  const world = getCivilizationWorld(seed)
  stepCivilizationWorld(world)

  try {
    const result = applyDiplomaticAction(
      world,
      { actorId: PLAYER_REALM_ID, targetId, action },
      world.attitudeCycle + 1,
    )
    return jsonResponse({
      result: {
        actorId: result.actor.id,
        targetId: result.target.id,
        description: result.description,
        relationship: result.relationship,
      },
      civilizations: summarizeCivilizations(world, PLAYER_REALM_ID),
      attitudeCycle: world.attitudeCycle,
      updatedAt: world.lastUpdatedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ error: message }, { status: 400 })
  }
}
