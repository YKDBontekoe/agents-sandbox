import { useEffect, useRef } from 'react';

export function useLocalStoragePersistence<T>(
  key: string,
  data: T,
  onHydrate: (stored: T) => void,
): void {
  const onHydrateRef = useRef(onHydrate);

  useEffect(() => {
    onHydrateRef.current = onHydrate;
  }, [onHydrate]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        onHydrateRef.current(JSON.parse(raw) as T);
      }
    } catch {
      // ignore
    }
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [key, data]);
}

