// The single data-layer switch. One const tuple feeds both the type and the env schema.
// Backend phase: add 'supabase' (docs/ARCHITECTURE.md §4.3).
export const DATA_SOURCES = ['mock'] as const;
export type DataSource = (typeof DATA_SOURCES)[number];
