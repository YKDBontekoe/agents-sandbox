import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SupabaseUnitOfWork } from "@/infrastructure/supabase/unit-of-work";
import type { GameState } from "@engine";
import type { ResourceType } from "@/lib/resources";
import PrefetchResources from "@/components/PrefetchResources";

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
  const icons: Record<ResourceType, string> = {
    grain: "\uD83C\uDF3E",
    coin: "\uD83D\uDCB0",
    mana: "\uD83E\uDE84",
    favor: "\u2728",
    unrest: "\uD83D\uDE21",
    threat: "\uD83D\uDC7F",
  } as const;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-heading-1 font-display mb-4">Arcane Dominion</h1>
        {state ? (
          <>
            <p className="text-neutral-700 mb-8">Cycle {state.cycle}</p>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-12">
              {entries.map(([key, value]) => (
                <li key={key} className="card flex flex-col items-center gap-2">
                  <span className="text-3xl" aria-hidden>
                    {icons[key]}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-wide text-neutral-600">
                    {key}
                  </span>
                  <span className="font-semibold text-lg">{value}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-neutral-600 mb-12">No game data available.</p>
        )}
        <a href="/play" className="btn-primary px-8 py-3 text-lg">
          Enter the Council
        </a>
      </section>
      <section className="py-16">
        <div className="container-base grid gap-8 sm:grid-cols-3 text-center">
          <div className="card space-y-2">
            <h3 className="text-heading-4">Balance Scarcity</h3>
            <p className="text-sm text-neutral-600">
              Grain and mana ebb each cycle; steward them wisely to survive.
            </p>
          </div>
          <div className="card space-y-2">
            <h3 className="text-heading-4">Temper Unrest</h3>
            <p className="text-sm text-neutral-600">
              Wardens and Scribes hold the line as tensions simmer in the city.
            </p>
          </div>
          <div className="card space-y-2">
            <h3 className="text-heading-4">Pursue Favor</h3>
            <p className="text-sm text-neutral-600">
              Gain the council’s blessing to unlock new edicts and growth.
            </p>
          </div>
        </div>
      </section>
      <PrefetchResources />
    </div>
  );
}
