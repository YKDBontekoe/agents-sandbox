import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface Params { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = createSupabaseServerClient()
  const { id } = params
  const { decision, comment } = await req.json().catch(() => ({}))
  if (!['accept','reject'].includes(decision)) {
    return NextResponse.json({ error: 'decision must be accept or reject' }, { status: 400 })
  }

  const { data: prop, error: propErr } = await supabase.from('proposals').select('*').eq('id', id).maybeSingle()
  if (propErr) return NextResponse.json({ error: propErr.message }, { status: 500 })
  if (!prop) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  // Record decision
  const { error: decErr } = await supabase.from('decisions').insert({ proposal_id: id, decision, comment })
  if (decErr) return NextResponse.json({ error: decErr.message }, { status: 500 })

  // Update proposal status
  const status = decision === 'accept' ? 'accepted' : 'rejected'
  const { error: upErr } = await supabase.from('proposals').update({ status }).eq('id', id)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}