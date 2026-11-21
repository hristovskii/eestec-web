// The single data-layer switch. One const tuple feeds both the type and the env schema.
export const DATA_SOURCES = ['mock', 'supabase'] as const;
export type DataSource = (typeof DATA_SOURCES)[number];
