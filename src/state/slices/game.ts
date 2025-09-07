export interface GameState {
  id: string | null;
}

export type GameAction =
  | { type: 'game/set'; payload: { id: string } }
  | { type: 'game/clear' }
  | { type: 'game/hydrate'; payload: GameState };

export const initialGameState: GameState = {
  id: null,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'game/set':
      return { id: action.payload.id };
    case 'game/clear':
      return { id: null };
    case 'game/hydrate':
      return action.payload;
    default:
      return state;
  }
}

