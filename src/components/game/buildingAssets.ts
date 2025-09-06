// Sprite URL resolver for 2D art assets living under /public/sprites
// Prefer SVGs in /sprites/buildings; optional PNG set in /sprites/medieval

const USE_MEDIEVAL_ASSETS = false; // flip to true to use PNG set

export function getBuildingSpriteUrl(typeId: string): string | null {
  if (USE_MEDIEVAL_ASSETS) {
    const medieval: Record<string, string> = {
      council_hall: '/sprites/medieval/council-hall.png',
      trade_post: '/sprites/medieval/trade-post.png',
      automation_workshop: '/sprites/medieval/automation-workshop.png',
      farm: '/sprites/medieval/farm.png',
      shrine: '/sprites/medieval/shrine.png',
      house: '/sprites/medieval/house.png',
      lumber_camp: '/sprites/medieval/lumber-camp.png',
      sawmill: '/sprites/medieval/sawmill.png',
      storehouse: '/sprites/medieval/storehouse.png',
    };
    return medieval[typeId] || null;
  }
  // Default to SVG set
  const vector: Record<string, string> = {
    council_hall: '/sprites/buildings/council-hall.svg',
    trade_post: '/sprites/buildings/trade-post.svg',
    automation_workshop: '/sprites/buildings/automation-workshop.svg',
    farm: '/sprites/buildings/farm.svg',
    lumber_camp: '/sprites/buildings/lumber-camp.svg',
    sawmill: '/sprites/buildings/sawmill.svg',
    storehouse: '/sprites/buildings/storehouse.svg',
    shrine: '/sprites/buildings/shrine.svg',
    house: '/sprites/buildings/house.svg',
  };
  return vector[typeId] || null;
}

// Return a prioritized list of candidate sprite URLs for a building at a given level.
// This lets the renderer try level-specific art first and fall back to the base icon if not present.
export function getBuildingSpriteCandidates(typeId: string, level: number = 1): string[] {
  const base = getBuildingSpriteUrl(typeId);
  if (!base) return [];
  const safeLevel = Math.max(1, Math.floor(level || 1));
  // split extension
  const match = base.match(/^(.*)\.(svg|png)$/i);
  if (!match) return [base];
  const prefix = match[1];
  const ext = match[2];
  const candidates = [
    `${prefix}-lv${safeLevel}.${ext}`,
    `${prefix}-l${safeLevel}.${ext}`,
    `${prefix}-${safeLevel}.${ext}`,
    base,
  ];
  return candidates;
}
