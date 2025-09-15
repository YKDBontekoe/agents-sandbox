import { useCallback } from 'react';
import { useAppDispatch } from './store';
import { addNotification } from './slices/notifications';

const __recentNotifications = new Map<string, number>();

export function useNotify() {
  const dispatch = useAppDispatch();
  return useCallback((n: { type: 'info' | 'warning' | 'error' | 'success'; title: string; message: string; persistent?: boolean; dedupeKey?: string; dedupeMs?: number }) => {
    const key = n.dedupeKey ?? `${n.type}|${n.title}|${n.message}`;
    const windowMs = typeof n.dedupeMs === 'number' ? n.dedupeMs : 30000;
    const now = Date.now();
    const last = __recentNotifications.get(key) ?? 0;
    if (now - last < windowMs) return;
    __recentNotifications.set(key, now);
    // Only dispatch allowed notification fields; do not include dedupe metadata
    dispatch(addNotification({ type: n.type, title: n.title, message: n.message, persistent: n.persistent } as any));
  }, [dispatch]);
}

