import { useCallback } from 'react';
import { useAppDispatch } from './store';
import { addNotification } from './notifications';

export function useNotify() {
  const dispatch = useAppDispatch();
  return useCallback((n: { type: 'info' | 'warning' | 'error' | 'success'; title: string; message: string; persistent?: boolean }) => {
    dispatch(addNotification(n));
  }, [dispatch]);
}

