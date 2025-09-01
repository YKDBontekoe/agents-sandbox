'use client';

import { useCallback, useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export function useUserPreference<T>(key: string, defaultValue: T) {
  const storageKey = `pref_${key}`;
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) as T : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('user_preferences')
          .select('value')
          .eq('user_id', user.id)
          .eq('key', key)
          .maybeSingle();
        if (data && data.value !== undefined && mounted) {
          const remote = data.value as T;
          setValue(remote);
          try { window.localStorage.setItem(storageKey, JSON.stringify(remote)); } catch {}
        }
      } catch {
        // ignore
      }
    };
    load();
    return () => { mounted = false; };
  }, [key, storageKey]);

  const update = useCallback(async (next: T) => {
    setValue(next);
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, key, value: next });
    } catch {
      // ignore
    }
  }, [key, storageKey]);

  return [value, update] as const;
}
