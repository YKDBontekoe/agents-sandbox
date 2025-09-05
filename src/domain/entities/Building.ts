export interface Building {
  id?: string;
  typeId?: string;
  workers?: number;
  level?: number;
  traits?: Record<string, unknown>;
  recipe?: string;
  [key: string]: unknown;
}
