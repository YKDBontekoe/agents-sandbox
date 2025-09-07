"use client";

import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { rootReducer, initialState, type RootAction, type RootState } from './slices';
import { useLocalStoragePersistence } from './persistence';

const StoreContext = createContext<{ state: RootState; dispatch: React.Dispatch<RootAction> } | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(rootReducer, initialState);

  useLocalStoragePersistence('ad_notifications', state.notifications.list, (list) => {
    dispatch({ type: 'notifications/hydrate', payload: { list } });
  });

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
