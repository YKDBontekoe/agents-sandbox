'use client';

import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function Home() {
  const handleLogin = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signInWithOAuth({ provider: 'github' });
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center space-y-6">
        <h1 className="text-heading-2">Arcane Dominion</h1>
        <div className="space-y-4">
          <button onClick={handleLogin} className="btn-primary px-8 py-4">
            Log In
          </button>
          <Link href="/play" className="btn-secondary px-8 py-4 inline-block">
            Continue as Guest
          </Link>
        </div>
      </div>
    </main>
  );
}
