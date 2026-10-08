// Map tiles in one place (docs/ARCHITECTURE.md §9): swap the provider by changing this value.
// The CSP (next.config.ts) allows images from the origin of this URL, so nothing else changes.
// OpenStreetMap's own tile server is fine for a low-traffic site: its usage policy asks for a
// visible attribution (below) and no heavy use. Moving to a hosted provider later is one edit.
export const MAP_TILES = {
  /** {z}/{x}/{y} are filled in by Leaflet; {s} would be a subdomain. */
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
} as const;

/** Where tile images come from (for the Content-Security-Policy). */
export const MAP_TILES_ORIGIN = new URL(MAP_TILES.url.replace('{s}', 'a')).origin;
