// Lightweight sprite URL generator using inline SVGs.
// Avoids bundling external image assets and works offline.

function svgWrap(content: string, w = 64, h = 64): string {
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' shape-rendering='crispEdges'>${content}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const USE_MEDIEVAL_ASSETS = false; // set to true if PNGs are provided under /public/sprites/medieval

export function getBuildingSpriteUrl(typeId: string): string | null {
  if (USE_MEDIEVAL_ASSETS) {
    const medieval: Record<string, string> = {
      council_hall: '/sprites/medieval/council-hall.png',
      trade_post: '/sprites/medieval/trade-post.png',
      automation_workshop: '/sprites/medieval/automation-workshop.png',
      farm: '/sprites/medieval/farm.png',
      shrine: '/sprites/medieval/shrine.png',
      house: '/sprites/medieval/house.png',
    };
    return medieval[typeId] || null;
  }
  // Default vector assets
  const vector: Record<string, string> = {
    council_hall: '/sprites/buildings/council-hall.svg',
    trade_post: '/sprites/buildings/trade-post.svg',
    automation_workshop: '/sprites/buildings/automation-workshop.svg',
    farm: '/sprites/buildings/farm.svg',
    shrine: '/sprites/buildings/shrine.svg',
    house: '/sprites/buildings/house.svg',
  };
  return vector[typeId] || null;
}
