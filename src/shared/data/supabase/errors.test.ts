import { describe, expect, it } from 'vitest';

import { DataError, dataErrorKind, isDataError, unwrap, unwrapMaybe } from './errors';

describe('data errors', () => {
  it.each([
    ['23505', 'conflict'],
    ['23503', 'in_use'],
    ['42501', 'forbidden'],
    ['22023', 'invalid'],
    ['23514', 'invalid'],
    ['PGRST116', 'not_found'],
    ['XX000', 'unknown'],
    [undefined, 'unknown'],
  ] as const)('maps %s to %s', (code, kind) => {
    expect(dataErrorKind(code)).toBe(kind);
  });

  it('returns the data of a successful call', () => {
    expect(unwrap({ data: 5, error: null })).toBe(5);
  });

  it('throws a DataError for a failed call', () => {
    expect(() => unwrap({ data: null, error: { code: '23505', message: 'duplicate' } })).toThrow(DataError);
  });

  it('treats a missing row as null', () => {
    expect(unwrapMaybe({ data: null, error: { code: 'PGRST116', message: 'none' } })).toBeNull();
    expect(() => unwrapMaybe({ data: null, error: { code: '42501', message: 'no' } })).toThrow('no');
  });

  it('recognises kinds', () => {
    const error = new DataError('conflict', 'x');
    expect(isDataError(error, 'conflict')).toBe(true);
    expect(isDataError(error, 'forbidden')).toBe(false);
    expect(isDataError(new Error('x'))).toBe(false);
  });
});
