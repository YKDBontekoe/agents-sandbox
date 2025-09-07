import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseUnitOfWork } from '@/infrastructure/supabase/unit-of-work'
import { z } from 'zod'
import { AppError, ValidationError } from '@logging'
import logger from '@/lib/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

const BodySchema = z.object({
  decision: z.enum(['accept', 'reject']),
  comment: z.string().optional(),
})

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const supabase = createSupabaseServerClient()
    const uow = new SupabaseUnitOfWork(supabase)
    const { id } = params
    const json = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message)
    }
    const { decision, comment } = parsed.data

    const prop = await uow.proposals.getById(id)
    if (!prop) throw new AppError('Proposal not found', 404)

    // Record decision
    const { error: decErr } = await supabase.from('decisions').insert({ proposal_id: id, decision, comment })
    if (decErr) throw new AppError(decErr.message)

    // Update proposal status
    const status = decision === 'accept' ? 'accepted' : 'rejected'
    await uow.proposals.update(id, { status })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    logger.error('Unhandled error deciding proposal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}