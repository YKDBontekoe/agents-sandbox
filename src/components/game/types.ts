import type { ReactNode } from "react";

export interface SimpleBuilding {
  id: string;
  typeId: string;
  x: number;
  y: number;
  workers?: number;
  level?: number;
}

export interface GameRendererProps {
  width?: number;
  height?: number;
  gridSize?: number;
  tileTypes?: string[][];
  onTileHover?: (x: number, y: number, tileType?: string) => void;
  onTileClick?: (x: number, y: number, tileType?: string) => void;
  children?: ReactNode;
  useExternalProvider?: boolean;
  enableEdgeScroll?: boolean;
  onReset?: () => void;
}
