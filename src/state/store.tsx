"use client";

import React, { createContext, useContext, useMemo, useReducer, useEffect } from 'react';
import { notificationsReducer, initialNotificationsState, type NotificationsAction } from './notifications';

type RootState = {
  notifications: ReturnType<typeof notificationsReducer> extends infer R ? R : never;
};

type RootAction = NotificationsAction; // Extend with more slices later

const StoreContext = createContext<{ state: RootState; dispatch: React.Dispatch<RootAction> } | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [notifState, notifDispatch] = useReducer(notificationsReducer, initialNotificationsState);
  const state: RootState = useMemo(() => ({ notifications: notifState }), [notifState]);
  const dispatch = notifDispatch as React.Dispatch<RootAction>;

  // Hydrate notifications from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ad_notifications');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          notifDispatch({ type: 'notifications/hydrate', payload: { list } });
        }
      }
    } catch {}
  }, []);

  // Persist notifications whenever they change
  useEffect(() => {
    try { localStorage.setItem('ad_notifications', JSON.stringify(state.notifications.list)); } catch {}
  }, [state.notifications.list]);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppDispatch() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useAppDispatch must be used within StoreProvider');
  return ctx.dispatch;
}

export function useAppSelector<T>(selector: (s: RootState) => T): T {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useAppSelector must be used within StoreProvider');
  return selector(ctx.state);
}
