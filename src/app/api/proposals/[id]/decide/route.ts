import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseUnitOfWork } from '@arcane/infrastructure/supabase'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

const BodySchema = z.object({
  decision: z.enum(['accept', 'reject']),
  comment: z.string().optional(),
})

export async function POST(req: NextRequest, context: RouteContext) {
  const params = await context.params
  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)
  const { id } = params
  const json = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message },
      { status: 400 },
    )
  }
  const { decision, comment } = parsed.data

  const prop = await uow.proposals.getById(id)
  if (!prop) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  // Record decision
  const { error: decErr } = await supabase.from('decisions').insert({ proposal_id: id, decision, comment })
  if (decErr) return NextResponse.json({ error: decErr.message }, { status: 500 })

  // Update proposal status
  const status = decision === 'accept' ? 'accepted' : 'rejected'
  try {
    await uow.proposals.update(id, { status })
  } catch (upErr: unknown) {
    const message = upErr instanceof Error ? upErr.message : String(upErr)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}