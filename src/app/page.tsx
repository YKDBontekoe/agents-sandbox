import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SupabaseUnitOfWork } from "@/infrastructure/supabase/unit-of-work";
import type { GameState } from "@engine";

async function getLatestState(): Promise<GameState | null> {
  try {
    const supabase = createSupabaseServerClient();
    const uow = new SupabaseUnitOfWork(supabase);
    return await uow.gameStates.getLatest();
  } catch {
    return null;
  }
}

export default async function Home() {
  const state = await getLatestState();
  const resources = state?.resources ?? {};
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <header className="container-base py-6">
        <h1 className="text-heading-2 font-display text-neutral-900">Arcane Dominion</h1>
      </header>
      <main className="container-base py-10">
        <section className="card-elevated p-6 mb-8">
          <h2 className="text-heading-3 text-neutral-800 mb-4">Current State</h2>
          {state ? (
            <>
              <p className="text-neutral-700 mb-4">Cycle {state.cycle}</p>
              <ul className="grid grid-cols-2 gap-2">
                {Object.entries(resources).map(([key, value]) => (
                  <li key={key} className="flex justify-between text-neutral-700">
                    <span className="capitalize">{key}</span>
                    <span>{value}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-neutral-600">No game data available.</p>
          )}
        </section>
        <div className="text-center">
          <Link href="/play" className="btn-primary text-lg px-8 py-4">
            Enter the Council
          </Link>
        </div>
      </main>
    </div>
  );
}
