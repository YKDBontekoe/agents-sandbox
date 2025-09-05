import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { commandBus } from '@/application/bus'
import { DecideProposalCommand } from '@/application/commands/decideProposal'

interface RouteContext {
  params: Promise<{ id: string }>
}

const BodySchema = z.object({
  decision: z.enum(['accept', 'reject']),
  comment: z.string().optional(),
})

export async function POST(req: NextRequest, context: RouteContext) {
  const params = await context.params
  const json = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message },
      { status: 400 },
    )
  }
  const { decision, comment } = parsed.data

  try {
    await commandBus.execute(new DecideProposalCommand(params.id, decision, comment))
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
