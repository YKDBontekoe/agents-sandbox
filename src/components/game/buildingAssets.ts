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

// Return sprite URL for a building. Since we don't have level-specific sprites,
// just return the base sprite to avoid 404 requests.
export function getBuildingSpriteCandidates(typeId: string, level: number = 1): string[] {
  const base = getBuildingSpriteUrl(typeId);
  if (!base) return [];
  // Only return the base sprite to avoid 404s for non-existent level variants
  return [base];
}
