import { useEffect } from 'react';

export function useLocalStoragePersistence<T>(
  key: string,
  data: T,
  onHydrate: (stored: T) => void,
): void {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        onHydrate(JSON.parse(raw) as T);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [key, data]);
}

