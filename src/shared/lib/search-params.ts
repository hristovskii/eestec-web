/** Query-string patch: a string sets the param, null or '' removes it. */
export type ParamsPatch = Record<string, string | null | undefined>;

/**
 * The URL `pathname?query` with `patch` applied. Lists keep filters, sort and page in the URL
 * (decided rule); any change other than the page itself returns to page 1.
 */
export function hrefWithParams(
  pathname: string,
  current: URLSearchParams | string,
  patch: ParamsPatch,
  { resetPage = true }: { resetPage?: boolean } = {},
): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === '') next.delete(key);
    else next.set(key, value);
  }
  if (resetPage && !('page' in patch)) next.delete('page');
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}
