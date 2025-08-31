"use client";

import { useEffect, useMemo, useState } from "react";

interface GameState {
  id: string;
  cycle: number;
  resources: Record<string, number>;
}

interface Proposal {
  id: string;
  guild: string;
  title: string;
  description: string;
  status: "pending" | "accepted" | "rejected" | "applied";
  predicted_delta: Record<string, number>;
}

export default function PlayPage() {
  const [state, setState] = useState<GameState | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [guild, setGuild] = useState("Wardens");
  const [error, setError] = useState<string | null>(null);

  async function fetchState() {
    const res = await fetch("/api/state");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to fetch state");
    setState(json);
  }

  async function fetchProposals() {
    const res = await fetch("/api/proposals");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to fetch proposals");
    setProposals(json.proposals || []);
  }

  useEffect(() => {
    (async () => {
      try {
        await fetchState();
        await fetchProposals();
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, []);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guild }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate proposals");
      await fetchProposals();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function scry(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${id}/scry`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to scry");
      await fetchProposals();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function decide(id: string, decision: "accept" | "reject") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to decide");
      await fetchProposals();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function tick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/state/tick`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to tick");
      setState(json);
      await fetchProposals();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const resourceKeys = useMemo(() => Object.keys(state?.resources || {}), [state]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <header className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-serif">The Council</h1>
            <p className="text-slate-400">Cycle {state?.cycle ?? 1}</p>
          </div>
          <div className="flex gap-2">
            <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={guild} onChange={e=>setGuild(e.target.value)}>
              <option>Wardens</option>
              <option>Alchemists</option>
              <option>Scribes</option>
              <option>Stewards</option>
            </select>
            <button onClick={generate} disabled={loading} className="rounded bg-indigo-600 px-3 py-1.5 hover:bg-indigo-500 disabled:opacity-50">Summon Proposals</button>
            <button onClick={tick} disabled={loading} className="rounded bg-emerald-600 px-3 py-1.5 hover:bg-emerald-500 disabled:opacity-50">Advance Cycle</button>
          </div>
        </header>

        {error && <div className="text-red-400">{error}</div>}

        <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {resourceKeys.map((k) => (
            <div key={k} className="rounded border border-slate-800 bg-slate-900 p-3">
              <div className="text-xs uppercase text-slate-400">{k}</div>
              <div className="text-xl font-semibold">{state?.resources?.[k] ?? 0}</div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-xl font-serif mb-3">Council Proposals</h2>
          <div className="grid gap-3">
            {proposals.length === 0 && (
              <div className="text-slate-400">No proposals yet. Summon your guilds.</div>
            )}
            {proposals.map((p) => (
              <div key={p.id} className="rounded border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-sm">{p.guild}</div>
                    <div className="text-lg font-medium">{p.title}</div>
                  </div>
                  <div>
                    <span className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700">{p.status}</span>
                  </div>
                </div>
                <p className="mt-2 text-slate-300">{p.description}</p>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2">
                  {Object.entries(p.predicted_delta || {}).map(([k,v]) => (
                    <div key={k} className="text-sm text-slate-400">{k}: <span className={Number(v) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{Number(v) >= 0 ? '+' : ''}{v as number}</span></div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => scry(p.id)} disabled={loading} className="rounded border border-indigo-700 text-indigo-300 px-3 py-1 hover:bg-indigo-950 disabled:opacity-50">Scry</button>
                  <button onClick={() => decide(p.id, 'accept')} disabled={loading || p.status!=='pending'} className="rounded bg-emerald-700 px-3 py-1 hover:bg-emerald-600 disabled:opacity-50">Accept</button>
                  <button onClick={() => decide(p.id, 'reject')} disabled={loading || p.status!=='pending'} className="rounded bg-rose-700 px-3 py-1 hover:bg-rose-600 disabled:opacity-50">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}