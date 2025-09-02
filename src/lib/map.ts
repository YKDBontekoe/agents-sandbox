export function generateTileTypes(size: number): string[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => {
      const r = Math.random();
      if (r < 0.1) return "water";
      if (r < 0.2) return "mountain";
      return "grass";
    }),
  );
}
