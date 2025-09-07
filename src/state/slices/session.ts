export interface SessionState {
  user: { id: string } | null;
}

export type SessionAction =
  | { type: 'session/set'; payload: { user: { id: string } } }
  | { type: 'session/clear' }
  | { type: 'session/hydrate'; payload: SessionState };

export const initialSessionState: SessionState = {
  user: null,
};

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case 'session/set':
      return { user: action.payload.user };
    case 'session/clear':
      return { user: null };
    case 'session/hydrate':
      return action.payload;
    default:
      return state;
  }
}

