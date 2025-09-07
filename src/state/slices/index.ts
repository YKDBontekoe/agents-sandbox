import {
  notificationsReducer,
  initialNotificationsState,
  type NotificationsAction,
  type NotificationsState,
} from './notifications';
import { sessionReducer, initialSessionState, type SessionAction, type SessionState } from './session';
import { gameReducer, initialGameState, type GameAction, type GameState } from './game';

export interface RootState {
  notifications: NotificationsState;
  session: SessionState;
  game: GameState;
}

export type RootAction = NotificationsAction | SessionAction | GameAction;

export const initialState: RootState = {
  notifications: initialNotificationsState,
  session: initialSessionState,
  game: initialGameState,
};

export function rootReducer(state: RootState, action: RootAction): RootState {
  return {
    notifications: notificationsReducer(state.notifications, action as NotificationsAction),
    session: sessionReducer(state.session, action as SessionAction),
    game: gameReducer(state.game, action as GameAction),
  };
}

export {
  notificationsReducer,
  sessionReducer,
  gameReducer,
  initialNotificationsState,
  initialSessionState,
  initialGameState,
};

