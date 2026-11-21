import type { Json } from './database.types';

/** A value for a `jsonb` column: the generated types want a non-null `Json`, the repositories hold domain objects. */
export const toJson = (value: unknown) => value as NonNullable<Json>;
