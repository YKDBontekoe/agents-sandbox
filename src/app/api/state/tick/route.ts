import { NextResponse } from 'next/server';
import { createSupabaseAdapter } from '@/infrastructure/supabase';
import { runTick } from '@/application/RunTick';

export async function POST() {
  try {
    const db = createSupabaseAdapter();
    const result = await runTick({ db });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
