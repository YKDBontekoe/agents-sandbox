import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-5xl p-6">
        <header className="py-8 border-b border-slate-700">
          <h1 className="text-3xl font-serif">Arcane Dominion Tycoon</h1>
          <p className="text-slate-400 mt-2">Rule through a living council. Set edicts, scry outcomes, decree.</p>
          <div className="mt-4">
            <Link className="rounded bg-indigo-600 px-4 py-2 hover:bg-indigo-500" href="/play">Enter Council</Link>
          </div>
        </header>
      </div>
    </main>
  );
}
