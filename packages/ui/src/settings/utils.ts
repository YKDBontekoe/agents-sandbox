import type {
  NumericChangeHandler,
  ToggleChangeHandler,
} from './types';

export const createToggleHandler = (
  handler: ToggleChangeHandler,
  onAnyChange: () => void,
): ToggleChangeHandler => {
  return (value: boolean) => {
    handler(Boolean(value));
    onAnyChange();
  };
};

export const createNumericHandler = (
  handler: NumericChangeHandler,
  onAnyChange: () => void,
): NumericChangeHandler => {
  return (value: number) => {
    handler(Number(value));
    onAnyChange();
  };
};
