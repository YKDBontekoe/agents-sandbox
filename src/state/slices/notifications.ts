import type { Notification } from '@/components/game/hud/types';

export interface NotificationsState {
  list: Notification[];
}

export type NotificationsAction =
  | { type: 'notifications/add'; payload: Omit<Notification, 'id' | 'timestamp' | 'read'> & { id?: string } }
  | { type: 'notifications/dismiss'; payload: { id: string } }
  | { type: 'notifications/clear' }
  | { type: 'notifications/markRead'; payload: { id: string } }
  | { type: 'notifications/hydrate'; payload: { list: Notification[] } };

export const initialNotificationsState: NotificationsState = {
  list: [],
};

export function notificationsReducer(
  state: NotificationsState,
  action: NotificationsAction,
): NotificationsState {
  switch (action.type) {
    case 'notifications/add': {
      const id =
        action.payload.id ||
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2));
      const n: Notification = {
        id,
        timestamp: Date.now(),
        type: action.payload.type,
        title: action.payload.title,
        message: action.payload.message,
        persistent: action.payload.persistent,
        action: action.payload.action,
        read: false,
      };
      return { ...state, list: [n, ...state.list].slice(0, 20) };
    }
    case 'notifications/dismiss': {
      return { ...state, list: state.list.filter((n) => n.id !== action.payload.id) };
    }
    case 'notifications/clear': {
      return { ...state, list: [] };
    }
    case 'notifications/markRead': {
      return {
        ...state,
        list: state.list.map((n) => (n.id === action.payload.id ? { ...n, read: true } : n)),
      };
    }
    case 'notifications/hydrate': {
      return { ...state, list: action.payload.list };
    }
    default:
      return state;
  }
}

export const addNotification = (
  payload: Omit<Notification, 'id' | 'timestamp'> & { id?: string },
): NotificationsAction => ({ type: 'notifications/add', payload });

export const dismissNotification = (id: string): NotificationsAction => ({
  type: 'notifications/dismiss',
  payload: { id },
});

export const clearNotifications = (): NotificationsAction => ({ type: 'notifications/clear' });

export const markRead = (id: string): NotificationsAction => ({
  type: 'notifications/markRead',
  payload: { id },
});

