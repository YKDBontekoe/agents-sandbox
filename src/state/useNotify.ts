import { useCallback } from 'react';
import { useAppDispatch } from './store';
import { addNotification } from './slices/notifications';

type NotificationPayload = Parameters<typeof addNotification>[0];

type NotifyOptions = NotificationPayload & {
  dedupeKey?: string;
  dedupeMs?: number;
};

const __recentNotifications = new Map<string, number>();

export function useNotify() {
  const dispatch = useAppDispatch();
  return useCallback((notification: NotifyOptions) => {
    const { dedupeKey, dedupeMs, ...payload } = notification;
    const key = dedupeKey ?? `${payload.type}|${payload.title}|${payload.message}`;
    const windowMs = typeof dedupeMs === 'number' ? dedupeMs : 30000;
    const now = Date.now();
    const last = __recentNotifications.get(key) ?? 0;
    if (now - last < windowMs) return;
    __recentNotifications.set(key, now);
    // Only dispatch allowed notification fields; do not include dedupe metadata
    dispatch(addNotification(payload));
  }, [dispatch]);
}

