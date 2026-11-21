/**
 * PostgREST writes timestamps as `2026-10-04T15:12:00+00:00`; the app holds `toISOString()` text
 * (`2026-10-04T15:12:00.000Z`) so equal moments are equal strings and sort the same way.
 */
export const isoOf = (value: string): string => new Date(value).toISOString();

export const isoOrNull = (value: string | null): string | null => (value === null ? null : isoOf(value));
