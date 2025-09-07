import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/middleware/rateLimit'
import { scryProposal } from '@application'

interface RouteContext {
  params: Promise<{ id: string }>
}

const BodySchema = z.object({})


export async function POST(req: NextRequest, context: RouteContext) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limit = Number(process.env.PROPOSAL_RATE_LIMIT ?? '5')
  if (!rateLimit(ip, { limit })) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  const params = await context.params
  const { id } = params
  const body = await req.json().catch(() => ({}))
  const bodyResult = BodySchema.safeParse(body)
  if (!bodyResult.success) {
    return NextResponse.json(
      { error: bodyResult.error.message },
      { status: 400 },
    )
  }

  try {
    const result = await scryProposal(id)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}