'use client';

import { useCallback } from 'react';

export function useIdGenerator() {
  return useCallback(() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
  }, []);
}

