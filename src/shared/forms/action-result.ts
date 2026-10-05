/**
 * What every Server Action returns (docs/ARCHITECTURE.md §7). Messages are i18n keys, never
 * translated text: actions can't read the locale; the client translates them.
 */
export type FieldErrors = Record<string, string[]>;

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: 'validation'; fieldErrors: FieldErrors }
  | { ok: false; error: 'forbidden' | 'not_found' | 'conflict' | 'unexpected'; message?: string }
  | { ok: false; error: 'rate_limited'; retryAt: string };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

/** zod issues → { field: [messageKey] } */
export function fieldErrorsFrom(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || '_form';
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}
