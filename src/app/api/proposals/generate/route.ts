import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdapter } from '@/infrastructure/supabase';
import { createOpenAIProposalGenerator } from '@/infrastructure/openai';
import { generateProposal } from '@/application/GenerateProposal';

const BodySchema = z.object({ guild: z.string().optional() });

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const db = createSupabaseAdapter();
  const ai = createOpenAIProposalGenerator() || undefined;
  try {
    const proposals = await generateProposal({ db, ai, guild: parsed.data.guild ?? 'Wardens' });
    return NextResponse.json(proposals);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
