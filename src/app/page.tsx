import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SupabaseUnitOfWork } from "@/infrastructure/supabase/unit-of-work";
import type { GameState } from "@engine";
import ResourceIcon from "@/components/ui/ResourceIcon";
import type { ResourceType } from "@/lib/resources";

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
  const entries = Object.entries(resources) as [ResourceType, number][];
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 text-neutral-900">
      <header className="container-base py-8 text-center">
        <h1 className="text-heading-1 font-display mb-2">Arcane Dominion</h1>
        <p className="text-neutral-700">Steward the fragile city-state through each cycle.</p>
      </header>
      <main className="container-base py-10 space-y-10">
        <section className="card-elevated p-6">
          <h2 className="text-heading-3 mb-4">Current State</h2>
          {state ? (
            <>
              <p className="text-neutral-700 mb-6">Cycle {state.cycle}</p>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {entries.map(([key, value]) => (
                  <li key={key} className="flex items-center gap-2">
                    <ResourceIcon type={key} value={value} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-neutral-600">No game data available.</p>
          )}
        </section>
        <div className="text-center">
          <a href="/play" className="btn-primary text-lg px-8 py-4">
            Enter the Council
          </a>
        </div>
      </main>
    </div>
  );
}
