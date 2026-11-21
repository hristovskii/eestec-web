import type { PostgrestError } from '@supabase/supabase-js';

/**
 * What a failed database call means to a repository: the Postgres error codes the schema relies on
 * (supabase/AGENTS.md) turned into a small set a caller can branch on.
 */
export type DataErrorKind = 'conflict' | 'in_use' | 'forbidden' | 'invalid' | 'not_found' | 'unknown';

export class DataError extends Error {
  constructor(
    readonly kind: DataErrorKind,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'DataError';
  }
}

export function dataErrorKind(code: string | undefined): DataErrorKind {
  if (code === undefined) return 'unknown';
  switch (code) {
    case '23505':
      return 'conflict';
    case '23503':
      return 'in_use';
    case '42501':
      return 'forbidden';
    case '22023':
    case '22P02':
    case '23502':
    case '23514':
      return 'invalid';
    case 'PGRST116':
      return 'not_found';
    default:
      return 'unknown';
  }
}

export const toDataError = (error: Pick<PostgrestError, 'code' | 'message'>): DataError =>
  new DataError(dataErrorKind(error.code), error.message, error.code);

type Result<D> = { data: D; error: Pick<PostgrestError, 'code' | 'message'> | null };

/** The data of a successful call; a failed call throws a DataError. */
export function unwrap<D>(result: Result<D>): NonNullable<D> {
  if (result.error) throw toDataError(result.error);
  return result.data as NonNullable<D>;
}

/** Like `unwrap`, but "no such row" is `null` instead of an error. */
export function unwrapMaybe<D>(result: Result<D>): NonNullable<D> | null {
  if (result.error) {
    const error = toDataError(result.error);
    if (error.kind === 'not_found') return null;
    throw error;
  }
  return result.data ?? null;
}

/** True when `error` is a DataError of one of these kinds (repositories turn them into results). */
export const isDataError = (error: unknown, ...kinds: DataErrorKind[]): error is DataError =>
  error instanceof DataError && (kinds.length === 0 || kinds.includes(error.kind));
