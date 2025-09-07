import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/middleware/rateLimit'
import { generateProposals } from '@application'

const BodySchema = z.object({
  guild: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limit = Number(process.env.PROPOSAL_RATE_LIMIT ?? '5')
  if (!rateLimit(ip, { limit })) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  const json = await req.json().catch(() => ({}))
  const parsedBody = BodySchema.safeParse(json)
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.message },
      { status: 400 },
    )
  }
  const { guild = 'Wardens' } = parsedBody.data
  try {
    const inserted = await generateProposals(guild)
    return NextResponse.json(inserted)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
